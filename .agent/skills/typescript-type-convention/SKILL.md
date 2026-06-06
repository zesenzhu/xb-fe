---
name: typescript-type-convention
description: TypeScript 强类型规范技能。提倡“能不用 any 就不用”的原则。对于未知数据或复杂逻辑，优先设计或复用 Interface/Type，或使用 unknown 进行类型收窄，规避 any 滥用。
---

# TypeScript 强类型规约 (typescript-type-convention)

本技能包定义了统一的 TypeScript 编码类型规范。在编写前端 Next.js 页面、React 组件、自定义 Hooks 以及工具函数时，**必须严格遵循“高类型安全性”原则，禁止滥用 `any`**。

---

## 1. 核心规约准则

### 1.1 “Any-Free” 铁律（能不用 any 就不用）
*   **原则**：`any` 会彻底关闭 TypeScript 的编译器类型安全检查。除非是非常极端、无法解决的第三方库类型冲突，否则**一律禁止**直接声明变量、函数参数或返回值为 `any`。
*   **自建类型**：如果没有现成的类型，应当优先根据数据结构自主声明 `interface` 或 `type`。

### 1.2 替代 any 的三种黄金方案
1.  **优先建立自建类型 (Interface / Type)**：
    *   对于 API 接口数据、表单字段、组件 Props，必须设计完整的类型定义。
2.  **使用 `unknown` 配合类型收窄 (Type Narrowing)**：
    *   对于真正无法提前确定的外部输入（例如网络响应、动态解析的 JSON、通用事件回调等），声明为 `unknown` 而不是 `any`。在使用时，通过 `typeof`、`instanceof`、`in` 操作符或自定义类型守卫进行收窄。
3.  **使用泛型 (Generics) 保留上下文类型**：
    *   在编写通用的组件、工具函数或 API 请求包装器时，使用泛型 `<T>` 将类型控制权交给调用方，避免直接使用 `any` 破坏链式调用中的类型推导。

---

## 2. 场景化代码示例

### 2.1 场景一：API 请求与响应数据处理
当从 API 异步获取数据时，严禁使用 `any` 接收。

*   **错误示范 🔴（使用 any 丢失类型安全）**：
    ```typescript
    // 错误：直接把 API 结果定义为 any，后续拼写错误编译器不会报错
    const fetchUserProfile = async (userId: string): Promise<any> => {
      const response = await api.get(`/users/${userId}`);
      return response.data; // 这里的 data 是 any
    };

    const user = await fetchUserProfile("123");
    console.log(user.nickName); // ⚠️ 拼写错误（应为 nickname），但 TS 不会报错，导致运行时 undefined
    ```

*   **正确示范 🟢（定义自建类型）**：
    ```typescript
    // 正确：定义明确的 UserProfile 接口
    interface UserProfile {
      id: string;
      username: string;
      nickname: string;
      email: string;
      status: number;
    }

    const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
      const response = await api.get<UserProfile>(`/users/${userId}`);
      return response.data;
    };

    const user = await fetchUserProfile("123");
    console.log(user.nickname); // ✅ 安全访问，若拼写错误（如 nickName）TS 编译器会立刻报错
    ```

---

### 2.2 场景二：无法确定具体类型的数据
当编写通用解析器、配置项或接收第三方未知结构的数据时。

*   **错误示范 🔴（滥用 any）**：
    ```typescript
    // 错误：使用 any 绕过检查，在运行时可能导致属性访问崩溃
    function logPayload(payload: any) {
      console.log(payload.meta.timestamp); // ⚠️ 如果 payload 为空或没有 meta 属性，直接运行时报错崩溃
    }
    ```

*   **正确示范 🟢（使用 unknown + 类型收窄）**：
    ```typescript
    // 正确：声明为 unknown，安全地进行存在性校验后才允许访问
    function logPayload(payload: unknown) {
      if (
        payload && 
        typeof payload === 'object' && 
        'meta' in payload &&
        payload.meta &&
        typeof payload.meta === 'object' &&
        'timestamp' in payload.meta
      ) {
        console.log((payload.meta as { timestamp: string }).timestamp); // ✅ 安全取值
      } else {
        console.log("无效的数据结构");
      }
    }
    ```

---

### 2.3 场景三：封装通用公共函数
当函数需要处理多种不同类型的数据，但数据结构之间存在关联时。

*   **错误示范 🔴（使用 any 导致失去推导）**：
    ```typescript
    // 错误：使用 any 导致入参和出参的类型信息在调用处全部丢失
    function getFirstElement(arr: any[]): any {
      return arr[0];
    }

    const firstUser = getFirstElement(users); // firstUser 变成了 any
    ```

*   **正确示范 🟢（使用泛型 Generics）**：
    ```typescript
    // 正确：使用泛型 T，调用时会自动推导出数组元素的精确类型
    function getFirstElement<T>(arr: T[]): T {
      return arr[0];
    }

    const firstUser = getFirstElement(users); // ✅ firstUser 的类型被完美自动推导为 UserItem
    ```

---

## 3. 极少数必须使用 any 的豁免条件

在极少数情况下（如处理包含海量泛型推导的第三方库极其底层的复杂 React 组件 HOC 或是类型冲突），如果实在无法消除编译错误而必须使用 `any`，必须满足以下条件：
1.  **添加 `// eslint-disable-next-line @typescript-eslint/no-explicit-any`**：并在上方加一行中文注释，简要说明**为什么这里不能用更安全的 interface 或 unknown**。
2.  **避免 any 的污染扩散**：应尽快将该 `any` 变量通过断言 `as PreciseType` 或类型收窄转化为明确的安全类型，严禁让 `any` 作为函数的公共 API 返回值扩散给外部调用者。

---

## 4. 辅助自检清单

在提交包含 TypeScript 代码的修改前，请确保：
1. [ ] 代码中是否新增了 `any` 声明？如果有，能否通过 `interface`、`type` 或 `unknown` 代替？
2. [ ] 新增的 API 网络请求、复杂的接口参数是否都建立了清晰的类型说明？
3. [ ] 必须使用泛型以保留上下文的地方是否正确使用了 `<T>`？
4. [ ] 仅在极端不可避免的情况下使用 `any`，且是否添加了中文原因释义？
