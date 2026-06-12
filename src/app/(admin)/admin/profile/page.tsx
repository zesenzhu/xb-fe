'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Tabs, Tag, Progress, Row, Col, Space, message, Badge, Upload } from 'antd';
import { User, KeyRound, Shield, Mail, Pencil, CheckCircle2, AlertCircle } from 'lucide-react';
import ImgCrop from 'antd-img-crop';
import { api } from '@/lib/axios';
import { useUserStore } from '@/store/useUserStore';
import { getFileUrl } from '@/lib/utils';

interface UserDetail {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  role?: {
    id: string;
    name: string;
    description?: string;
  };
  permissions: string[];
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserDetail | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordStatus, setPasswordStatus] = useState<'exception' | 'normal' | 'success'>('normal');
  const [passwordStatusText, setPasswordStatusText] = useState('弱');
  const [passwordColor, setPasswordColor] = useState('#ff4d4f');

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  
  const { updateUser } = useUserStore();

  // 加载当前登录用户的个人基本信息与权限明细
  const loadProfile = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/users/me');
      setProfile(res);
      profileForm.setFieldsValue({
        nickname: res.nickname,
        email: res.email,
        avatar: res.avatar,
      });
      // 同步更新 Zustand 全局状态，解决导航栏等位置数据未更新的问题
      updateUser({
        nickname: res.nickname,
        email: res.email,
        avatar: res.avatar,
      });
    } catch (err: any) {
      message.error(err.message || '获取个人信息失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // 辅助方法：将裁剪后的 File 用 Canvas 等比压缩至 300x300 正方形 JPEG 格式，以减少带宽和存储
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 300; // 头像物理尺寸，足够清晰且非常轻量
          let width = img.width;
          let height = img.height;

          // 保持正方形（由 ImgCrop 裁剪出来必然是 1:1，此处进行强制尺寸限制）
          if (width > MAX_SIZE) {
            width = MAX_SIZE;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 设置平滑缩放
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file); // 兜底返回原文件
              }
            },
            'image/jpeg',
            0.8 // 80% JPEG 高品质压缩
          );
        };
      };
    });
  };

  // 处理头像本地上传与压缩
  const compressAndUploadAvatar = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setLoading(true);
    try {
      // 1. 在前端使用 Canvas 完成高比例压缩
      const compressedBlob = await compressImage(file as File);
      
      // 2. 构造物理 multipart 载荷
      const formData = new FormData();
      formData.append('file', compressedBlob, 'avatar.jpg');

      // 3. 上传到 NestJS 物理文件托管控制器
      const res: any = await api.post('/upload/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res && res.url) {
        onSuccess?.(res);
        // 回填到 React Form 实例以待保存
        profileForm.setFieldsValue({ avatar: res.url });
        
        // 实时回填更新当前页面的头像状态
        if (profile) {
          setProfile({ ...profile, avatar: res.url });
        }
        message.success('头像文件已物理压缩并上传成功！');
      } else {
        throw new Error('未获取到返回的文件资源地址');
      }
    } catch (err: any) {
      onError?.(err);
      message.error(err.message || '头像文件上传失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 更新基本资料
  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        avatar: profile?.avatar || '',
      };
      await api.put<any>('/users/me', payload);
      message.success('个人基本信息更新成功！');
      
      // 同步更新 Zustand 全局状态
      updateUser({
        nickname: values.nickname,
        email: values.email,
        avatar: profile?.avatar,
      });
      
      // 刷新本页的 profile
      if (profile) {
        setProfile({
          ...profile,
          nickname: values.nickname,
          email: values.email,
        });
      }
    } catch (err: any) {
      message.error(err.message || '更新个人资料失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 密码强度检测
  const checkPasswordStrength = (value: string) => {
    if (!value) {
      setPasswordStrength(0);
      setPasswordStatusText('空');
      return;
    }

    let score = 0;
    
    // 长度检测
    if (value.length >= 6) score += 20;
    if (value.length >= 10) score += 20;
    
    // 字符类型检测
    if (/[a-z]/.test(value)) score += 15;
    if (/[A-Z]/.test(value)) score += 15;
    if (/[0-9]/.test(value)) score += 15;
    if (/[^a-zA-Z0-9]/.test(value)) score += 15;

    setPasswordStrength(score);

    if (score < 40) {
      setPasswordStatus('exception');
      setPasswordStatusText('较弱（建议包含大小写字母与数字）');
      setPasswordColor('#ff4d4f');
    } else if (score < 75) {
      setPasswordStatus('normal');
      setPasswordStatusText('中等（包含数字与英文字母）');
      setPasswordColor('#faad14');
    } else {
      setPasswordStatus('success');
      setPasswordStatusText('安全（强度极佳）');
      setPasswordColor('#52c41a');
    }
  };

  // 修改密码
  const handleUpdatePassword = async (values: any) => {
    setLoading(true);
    try {
      await api.put('/users/me/password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功，请妥善保管新密码！');
      passwordForm.resetFields();
      setPasswordStrength(0);
      setPasswordStatusText('空');
    } catch (err: any) {
      message.error(err.message || '修改密码失败，请验证旧密码是否正确');
    } finally {
      setLoading(false);
    }
  };

  // 动态生成首字母 HSL 渐变底色
  const getAvatarGradient = (username: string) => {
    const charCodeSum = username
      .split('')
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const hue = charCodeSum % 360;
    return `linear-gradient(135deg, hsl(${hue}, 80%, 60%) 0%, hsl(${(hue + 60) % 360}, 80%, 45%) 100%)`;
  };

  // 首字母徽标
  const renderDefaultAvatar = () => {
    if (!profile) return null;
    const name = profile.nickname || profile.username || 'U';
    const firstLetter = name.charAt(0).toUpperCase();
    const bgGradient = getAvatarGradient(profile.username);

    return (
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-black shadow-lg border-2 border-white dark:border-zinc-800 transition-transform hover:scale-105"
        style={{ background: bgGradient }}
      >
        {firstLetter}
      </div>
    );
  };

  // 渲染我的权限网格陈列
  const renderPermissionsGrid = () => {
    if (!profile) return null;
    const codes = profile.permissions || [];
    
    if (codes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-3 text-slate-300" />
          <p>当前登录角色未被授予任何系统功能权限码</p>
        </div>
      );
    }

    // 判断是否是超级管理员
    const isAdmin = codes.includes('*');

    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-500">我的角色：</span>
          <Tag color={isAdmin ? 'volcano' : 'blue'} className="px-3 py-0.5 rounded font-bold text-xs uppercase">
            {profile.role?.name || '普通成员'}
          </Tag>
          {profile.role?.description && (
            <span className="text-xs text-slate-400">({profile.role.description})</span>
          )}
        </div>

        {isAdmin ? (
          <div className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-amber-600 shrink-0 animate-pulse" />
            <div>
              <h4 className="text-sm font-black text-amber-800 dark:text-amber-300">拥有全量超级管理权限 (*)</h4>
              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                您当前处于超级管理员账号登录状态，拥有系统全部菜单、按钮及数据接口的直接操作/审计权限。
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {codes.map((code) => (
              <div
                key={code}
                className="p-3 bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/60 dark:border-zinc-800 rounded-lg flex items-center justify-between group hover:border-blue-400 dark:hover:border-blue-900 transition-all duration-300"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-semibold font-mono text-slate-700 dark:text-zinc-300">{code}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">允许操作的系统微服务路由</span>
                </div>
                <Badge status="processing" className="opacity-70 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* 模块页头 */}
      <div>
        <h1 className="text-xl font-black">个人中心</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
          更新您的系统账户基本信息、重新配置安全密码凭证以及审计您当前的安全授权明细
        </p>
      </div>

      <Row gutter={[24, 24]}>
        {/* 左侧头像与简介 */}
        <Col xs={24} md={8}>
          <Card
            className="text-center rounded-2xl border-slate-200 dark:border-zinc-800 shadow-sm"
            loading={loading && !profile}
          >
            <div className="flex flex-col items-center py-4">
              <div className="relative mb-4 cursor-pointer group">
                <ImgCrop aspect={1} showReset rotationSlider modalTitle="裁剪头像" modalOk="确定" modalCancel="取消">
                  <Upload
                    showUploadList={false}
                    customRequest={compressAndUploadAvatar}
                    beforeUpload={(file) => {
                      const isLt10M = file.size / 1024 / 1024 < 10;
                      if (!isLt10M) {
                        message.error('图片大小不能超过 10MB！');
                        return Upload.LIST_IGNORE;
                      }
                      return true;
                    }}
                  >
                    <div>
                      {profile?.avatar ? (
                        <img
                          src={getFileUrl(profile.avatar)}
                          alt="User Avatar"
                          className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-white dark:border-zinc-800 transition-transform group-hover:scale-105"
                          onError={() => {
                            // 头像加载失败时回退到默认首字母头像
                            if (profile) {
                              setProfile({ ...profile, avatar: '' });
                            }
                          }}
                        />
                      ) : (
                        renderDefaultAvatar()
                      )}
                      <span className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full shadow-md border-2 border-white dark:border-zinc-900 group-hover:bg-blue-700 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Upload>
                </ImgCrop>
              </div>
              <h2 className="text-lg font-black text-slate-800 dark:text-zinc-200">
                {profile?.nickname || profile?.username || '加载中...'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">@{profile?.username}</p>
              
              <div className="w-full border-t border-slate-100 dark:border-zinc-800 my-4" />

              <div className="w-full text-left space-y-3 px-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    账号角色
                  </span>
                  <Tag color="blue" className="m-0 font-bold text-[10px]">
                    {profile?.role?.name || '加载中'}
                  </Tag>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    电子邮箱
                  </span>
                  <span className="text-slate-700 dark:text-zinc-300 truncate max-w-40">
                    {profile?.email || '未绑定'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧表单 Tabs 控制器 */}
        <Col xs={24} md={16}>
          <Card className="rounded-2xl border-slate-200 dark:border-zinc-800 shadow-sm min-h-[400px]">
            <Tabs
              defaultActiveKey="1"
              items={[
                {
                  key: '1',
                  label: (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-1">
                      <User className="w-4 h-4" />
                      基本资料
                    </span>
                  ),
                  children: (
                    <Form
                      form={profileForm}
                      layout="vertical"
                      onFinish={handleUpdateProfile}
                      className="mt-4"
                    >
                      <Form.Item
                        name="nickname"
                        label="用户昵称"
                        rules={[{ required: true, message: '请填写用户昵称' }]}
                      >
                        <Input placeholder="输入展示昵称" className="h-10 rounded-lg max-w-xl" />
                      </Form.Item>
                      <Form.Item
                        name="email"
                        label="邮箱地址"
                        rules={[
                          { required: true, message: '请填写您的邮箱' },
                          { type: 'email', message: '请输入合法的邮箱格式' }
                        ]}
                      >
                        <Input placeholder="输入电子邮箱" className="h-10 rounded-lg max-w-xl" />
                      </Form.Item>
                      <div className="text-xs text-slate-400 dark:text-zinc-500 mb-6 bg-slate-50 dark:bg-zinc-800/20 p-4 rounded-xl max-w-xl border border-slate-100 dark:border-zinc-800/40">
                        提示：如需修改用户头像，请直接点击左侧名片上的头像区域（或点击右下角 ✏️ 按钮）进行本地上传。系统支持可视化裁剪并会自动压缩图像。
                      </div>
                      <Form.Item className="pt-2">
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          className="font-bold h-10 px-6 rounded-lg text-xs"
                        >
                          保存基本修改
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: '2',
                  label: (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-1">
                      <KeyRound className="w-4 h-4" />
                      安全密码
                    </span>
                  ),
                  children: (
                    <Form
                      form={passwordForm}
                      layout="vertical"
                      onFinish={handleUpdatePassword}
                      className="mt-4"
                    >
                      <Form.Item
                        name="oldPassword"
                        label="原账户密码"
                        rules={[{ required: true, message: '请输入旧密码以做安全验证' }]}
                      >
                        <Input.Password placeholder="输入当前使用的密码" className="h-10 rounded-lg max-w-xl" />
                      </Form.Item>
                      
                      <Form.Item
                        name="newPassword"
                        label="设置新密码"
                        rules={[
                          { required: true, message: '请输入新的登录密码' },
                          { min: 6, message: '新密码长度至少需要 6 个字符' }
                        ]}
                      >
                        <Input.Password
                          placeholder="输入复杂新密码 (不少于 6 位)"
                          className="h-10 rounded-lg max-w-xl"
                          onChange={(e) => checkPasswordStrength(e.target.value)}
                        />
                      </Form.Item>

                      {/* 密码强度指示条 */}
                      <div className="mb-6 px-1 max-w-xl">
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-400">密码安全度评价：</span>
                          <span className="font-bold" style={{ color: passwordColor }}>
                            {passwordStatusText}
                          </span>
                        </div>
                        <Progress
                          percent={passwordStrength}
                          status={passwordStatus}
                          strokeColor={passwordColor}
                          showInfo={false}
                          size="small"
                        />
                      </div>

                      <Form.Item
                        name="confirmPassword"
                        label="确认新密码"
                        dependencies={['newPassword']}
                        rules={[
                          { required: true, message: '请再次确认新密码' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('两次输入的密码不一致，请重新输入！'));
                            },
                          }),
                        ]}
                      >
                        <Input.Password placeholder="再次输入新密码" className="h-10 rounded-lg max-w-xl" />
                      </Form.Item>

                      <Form.Item className="pt-2">
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={loading}
                          className="font-bold h-10 px-6 rounded-lg text-xs"
                        >
                          确认重置密码
                        </Button>
                      </Form.Item>
                    </Form>
                  ),
                },
                {
                  key: '3',
                  label: (
                    <span className="flex items-center gap-1.5 text-xs font-bold px-1">
                      <Shield className="w-4 h-4" />
                      我的权限
                    </span>
                  ),
                  children: (
                    <div className="mt-4">
                      {renderPermissionsGrid()}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
