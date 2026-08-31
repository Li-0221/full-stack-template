# 前端接口调用工作流

本文是新增或修改同仓库后端接口时的唯一前端工作流。OpenAPI 和生成 SDK 拥有字段与端点定义；本文只说明如何消费它们。

## 1. 先完成后端契约

修改后端 request/response schema、route、service 和测试。确认状态码、业务码、权限、分页以及 omitted/`null`/普通值语义后，再生成前端代码。

```bash
make generate-client
git diff -- frontend/openapi.json frontend/src/client
```

禁止手工修改 `openapi.json` 和 `src/client`。生成结果不符合预期时应修改后端契约后重新生成。

## 2. 在功能数据层封装用例

接口调用放在 `src/features/<feature>/data`，组件只调用用例函数或 Query Options。直接使用生成的 Service、请求类型和响应类型。

```ts
import { UsersService, type UserCreateRequest } from '@/client'
import { generatedApiClient } from '@/lib/generated-api'

export async function createUser(request: UserCreateRequest) {
  const response = await UsersService.createUser({
    client: generatedApiClient,
    body: request,
  })
  return response.data.data
}
```

客户端选择：

| 场景 | 客户端 |
| --- | --- |
| 需要 Bearer token 的业务接口 | `generatedApiClient` |
| 登录、refresh、logout 等不应携带 access token 的接口 | `generatedPublicApiClient` |

不要新增通用 `request()`、额外 Axios 实例或业务 `fetch` wrapper。两个生成客户端已经统一处理 base URL、超时、业务错误；受保护客户端还负责 Bearer token 和 single-flight refresh。

## 3. 接入 TanStack Query

读取接口定义稳定的 query key，并包含所有影响结果的参数：

```ts
export const usersQueryKey = ['users'] as const

export function usersQueryOptions(params: PageParams) {
  return queryOptions({
    queryKey: [...usersQueryKey, 'list', params],
    queryFn: () => listUsers(params),
  })
}
```

写接口使用 mutation。成功后精确更新或失效相关 query；不要把服务端列表复制到 Zustand。分页、筛选和排序如果需要分享或浏览器前进/后退，应放在 URL，并与 query key 使用同一组参数。

## 4. 处理成功与失败

- 普通响应只有 `code === 0` 才成功；非零业务码统一抛出 `ApiError`。
- HTTP `401` 或业务码 `40111` 由受保护客户端刷新一次并重试原请求一次，页面不要重复实现刷新。
- refresh token 被拒绝时清理 session；临时网络错误保留当前 session 供重试。
- 页面区分首次加载、刷新、空数据、无权限和请求失败。失败不能降级成空数组或成功提示。
- Zod 用于表单、URL、浏览器持久化以及外部未类型化数据；同仓库生成的 response 不再重复定义字段 schema。

## 5. 验证与提交

至少运行功能数据层测试和受影响组件测试。修改契约、生成文件或共享请求层时运行：

```bash
make check-generated
cd frontend
pnpm lint
pnpm format:check
pnpm knip
pnpm test
pnpm build
```

提交前检查以下差异：

- 后端 schema/route/service 与 contract tests
- `frontend/openapi.json` 和 `frontend/src/client`
- 功能 `data` 层、Query/Mutation 和恢复行为
- 不包含手工生成类型、重复请求封装、凭据或本地产物
