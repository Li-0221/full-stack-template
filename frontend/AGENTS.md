# 项目规则

## 决策优先级

发生冲突时，按以下顺序处理：

1. 用户当前明确需求和已确认的后端 API 契约
2. 数据正确性、认证安全、可访问性和运行时可部署性
3. 本文件、当前仓库代码、测试和 `README.md`
4. 当前仓库已有共享组件与同类实现
5. 同类项目或上游参考实现

参考项目只能用于理解业务或交互，不能整目录覆盖当前仓库。依赖版本、认证、请求、环境变量、路由和部署实现必须以当前仓库为准。

## 项目定位

- 本项目是 TripGuru React Admin 管理系统，具体业务范围和后端契约以当前需求与项目代码为准。
- 核心技术栈为 React 19、Vite 8、TypeScript、TanStack Router、TanStack Query、TanStack Table、React Hook Form、Zod、Zustand、Tailwind CSS 4、Radix UI 和本地 shadcn/ui。
- 包管理器固定使用 pnpm；Node.js 和 pnpm 版本要求以 `package.json` 为准。
- Dashboard、Users 和 Tasks 可以作为当前页面结构与交互参考，但不能作为后端接口、字段、角色或权限契约来源。
- 认证页、公开错误页、登录后错误预览页和应用壳层是系统基础设施。清理或替换业务页面时不得顺带删除这些页面。
- 不得根据目录名、旧仓库代码或界面文案自行推断产品权限、接口路径、业务状态或数据字段。

## 文件组织

- 文件路由位于 `src/routes/**`，使用 TanStack Router 的 `createFileRoute`。
- `src/routeTree.gen.ts` 由 TanStack Router 插件生成，禁止手动编辑。
- 非简单路由文件保持轻量；页面主体放在 `src/features/<feature>`。
- 功能组件放在 `src/features/<feature>/components`。
- 功能请求、查询键、请求/响应类型、Schema 和 Query Options 放在 `src/features/<feature>/data`；不要把业务端点堆进通用 API 文件。
- 只有被多个领域复用的组件、Hook、工具、类型或 Store 才提升到 `src/components`、`src/hooks`、`src/lib`、`src/types` 或 `src/stores`。
- 单表单专用 Schema 可以靠近表单；跨文件使用时移入功能 `data` 目录。
- 小型且清晰的表格列可以在功能内定义为 `ColumnDef<T>[]` 常量；列较多、包含交互或需要复用时拆到 `<feature>/components/<feature>-columns.tsx`。
- 不创建按技术流程命名的业务目录，例如 `api-flows`、`requests` 或 `pages-common`。
- 保持 `@/` 路径别名和项目现有 import 排序，不引入第二套别名。

## 路由与页面门禁

- 除非需求明确说明页面公开，否则新业务页面必须放在 `src/routes/_authenticated` 下。
- `/_authenticated` 的门禁只检查 access token 是否存在。token 是否有效由后端负责，并由请求层处理 `401` 或自定义 code `40111`。
- 不要在页面组件内重复实现 token 检查、刷新或登录跳转。
- 未获得角色/权限契约前，不得创建臆测的 RBAC、菜单权限、按钮权限或前端角色判断。
- 以下认证页面保持公开：`/sign-in`、`/sign-in-2`、`/sign-up`、`/forgot-password`、`/otp`。
- 以下系统错误页面保持公开：`/401`、`/403`、`/404`、`/500`、`/503`。
- `/errors/$error` 是登录后应用壳层内的错误状态预览路由，必须继续受 `/_authenticated` 门禁保护；不要把它与公开数字错误页合并。
- 登录后的 redirect 只能指向应用内部地址，不能把未经校验的外部 URL 当作跳转目标。

## 认证边界

- 认证状态的唯一前端 owner 是 `src/stores/auth-store.ts`，当前 session 包含一个 `accessToken` 和一个 `refreshToken`。
- 不要在 localStorage、其他 Store、React Context 或页面 state 中复制 token。
- 使用项目现有认证流程，不得引入 Clerk 或第二套认证状态、路由门禁、请求凭据和退出流程。
- 现有 mock 登录不得进入可部署业务版本；接入认证时必须使用后端确认的真实接口，并通过 `auth.setTokens` 一次写入完整 token 对。
- refresh endpoint 只在应用初始化边界通过 `configureTokenRefresh` 注册一次；接口路径必须来自已确认的后端契约。
- HTTP `401` 和响应 code `40111` 会触发 single-flight refresh，并且原请求最多重试一次。不要在 Query Hook 或页面再套一层 refresh/retry。
- 刷新失败、refresh token 缺失或返回 token 不完整时必须清空 session；不得保留半登录状态。
- `skipAuth` 和 `skipAuthRefresh` 只用于登录、刷新等确实不应携带或刷新凭据的请求。
- 不得把账号、密码、token 或其他凭据写入仓库、环境示例、文档、测试快照或日志。

## API 契约

- 所有业务响应遵循 `{ code: number, data: T, message: string }`；只有数字 `code === 0` 表示成功。
- access token 失效的已知自定义 code 只有 `40111`。
- 统一使用 `src/lib/api-client.ts` 导出的 `request`；不要创建第二个 Axios 实例，也不要在组件中散布原始 `fetch`。
- `request<T>()` 已验证 envelope 并直接返回 `data`。调用方不得再次读取 `.data` 或把泛型写成完整 `ApiResponse<T>`。
- 非零业务 code 抛出 `ApiError`；非标准 envelope 抛出 `ApiResponseError`。不得用空数组、空对象或成功 Toast 掩盖错误。
- 分页请求统一为 `{ page, pageSize }`，默认值为 `page = 1`、`pageSize = 20`。
- 分页 data 统一为 `{ items, page, pageSize, total }`，公共类型使用 `PageParams` 和 `PageData<T>`。
- 未确认后端契约前，不要把 `offset`、`limit`、`current`、`perPage`、排序字段或筛选字段加入公共类型。
- 服务端数据使用 TanStack Query；Query Key 必须包含会改变结果的分页、筛选和排序参数。
- Mutation 成功后精确失效或更新相关 Query；不要用 Zustand 保存服务端列表或详情缓存。
- 接口 payload 不可信或存在 schema drift 风险时在功能数据层用 Zod 做运行时校验，不要把业务 Schema 塞进通用请求层。

## 表格与列表

- `/users` 是业务“表格 + 搜索”页面的规范交互基准。迁移页面必须沿用其页面标题与主操作布局、紧凑工具栏、URL 搜索状态、筛选重置、列显隐、分页、行操作菜单和对话框反馈节奏；不得直接搬回旧版展开式搜索卡片或另造第二套列表交互。
- 真实服务端列表在上述交互基准下使用 `ServerDataTable`。搜索和筛选字段通过 `useTableUrlState` 与 URL 同步，任一条件变化都回到第一页；`DataTableToolbar` 继续作为工具栏交互 owner，业务页面只提供已由后端确认的字段和选项。
- `/users` 只定义交互，不定义业务契约。不得复制其 mock 数据、角色、客户端排序、批量操作假设或 `pageSize = 10`；真实列表默认分页仍为 `20`，未确认服务端排序或批量能力时不展示对应控件。
- URL 是搜索、筛选和分页的可分享状态源；默认值和已清空条件不保留在 URL，浏览器前进/后退必须恢复控件和结果。后端单值筛选继续使用一致的 facet 外观，但只能单选，不得为了复用控件改变请求 shape。
- 服务端分页列表优先使用 `src/components/data-table/server-table.tsx` 的 `ServerDataTable`。
- 路由分页校验优先复用或扩展 `paginationSearchSchema`，并保持 `page`、`pageSize` 与 URL 同步。
- `ServerDataTable` 只封装手动分页、列显示、选择和通用加载状态；产品筛选、搜索和排序字段必须由具体 API 契约定义。
- 当前仓库没有 `ClientDataTable`。客户端小数据列表参考 Users/Tasks 的 TanStack Table 组合，不得导入不存在的封装。
- 共享表格不能覆盖需求时，先评估扩展现有封装；只有交互模型确实不同，或扩展会破坏通用边界时，才在功能内实现专用表格。
- 搜索和分面筛选优先复用 `DataTableToolbar`，分页统一使用 `DataTablePagination`；不要在页面中重复实现筛选表单或上一页、下一页区块。
- 不能因为界面显示筛选、排序、全选或批量操作控件，就假设后端已支持对应行为。
- 服务端排序不得只重排当前页；跨页全选和批量操作不得伪装成全量操作。
- 列表必须明确处理首次加载、后台刷新、空数据、错误、重试和无权限状态；请求失败不能显示为“暂无数据”。
- 翻页或修改 page size 时应清理只属于当前页的行选择；加载中或请求失败时不要依据临时空数据强制重置 URL 页码。
- 复杂列、行操作、批量操作和对话框拆到功能组件文件，不在页面主体直接堆积表格实现。
- 表格行内不提供 `View`、详情图标或“查看/配置详情”等纯详情操作。存在详情路由或详情视图时，整条数据行应显示手型光标，并支持鼠标点击和键盘 Enter 进入详情；行内复选框、菜单、按钮、链接等独立控件不得误触发行跳转。没有详情能力的表格行保持普通光标和非点击状态，不得伪造详情交互。

## 表单与状态

- 非简单业务表单使用 React Hook Form、Zod 和 `@hookform/resolvers`。
- 优先复用现有 `Form`、`FormField`、`FormItem`、`FormLabel`、`FormControl`、`FormMessage`、`Input`、`SelectDropdown` 等组件。
- 角色、状态、币种、时区、频率等简单枚举字段优先使用 `SelectDropdown`。
- 业务表单不要依赖原生 `required` 或临时 `FormData` 解析代替明确 Schema。
- 隐藏字段和简单工具栏查询控件可以使用原生表单能力，前提是引入 React Hook Form 不会带来实际校验或状态管理收益。
- API 调用和复杂请求映射放在功能数据层，保持表单提交函数精简。
- 可分享的分页、筛选、排序状态放在 URL；短生命周期 UI 状态留在组件或功能 Provider。
- Zustand 只用于认证、主题和真正跨功能的持久偏好；同一事实不得同时保存在 URL、Query Cache、Zustand 和组件 state。
- 成功、失败和恢复反馈使用项目已有 Sonner Toast、错误状态和确认对话框模式。

## UI、图标、视觉品质与可访问性

- 这是工作型管理控制台。保持紧凑、可扫描的信息层级，不制作营销 Hero、装饰性大卡片或低密度展示页。
- 视觉完成度、排版、动效和细节品质以 Awwwards、FWA、CSS Design Awards 的优秀获奖作品为质量标杆，但不得直接照搬营销网站的信息架构，也不得以视觉实验牺牲管理后台的任务效率、信息清晰度和可访问性。
- 将浏览器视为可交互的数字画布。在认证、概览、详情摘要、空状态和其他适合强化视觉表达的界面中，可以采用更具辨识度的构图、实验性排版、空间层次、高级渲染和具有物理质感的动效；常规列表、表单和 CRUD 工作流仍须保持紧凑、稳定、可预测。
- 需要图片素材时，充分利用用户提供的图片、品牌资产和多模态能力分析视觉参考，并在任务范围允许时生成或处理合适的位图素材。图片必须服务于真实内容、品牌或状态表达，并与排版、色彩和交互形成统一视觉叙事；不得使用模糊、空泛、图库感强或纯装饰性的图片填充界面。
- 沉浸式体验必须由内容、代码、渲染逻辑、素材和交互共同构成，不通过堆叠渐变、悬浮卡片或无意义动画制造视觉噪音。动效应解释层级、状态变化或操作结果，并支持 `prefers-reduced-motion`，避免影响首屏性能、键盘操作和长时间工作。
- 列表和常规 CRUD 的视觉密度可参考 `src/features/users`，但业务流程不能照搬其 mock 数据和交互假设。
- 常规管理页面优先使用 `Header`、`Main` 以及紧凑的标题、说明和操作区组合，延续 Users 页面的页头层级、间距、工具栏位置、操作密度和反馈节奏。
- 优先组合 `src/components/ui` 和现有共享组件；不要为一个页面重复造 Button、Dialog、Table 等基础组件。
- `src/components/ui` 是本地维护源码。修改基础组件前先检查调用位置；shadcn CLI 输出不得直接覆盖现有文件，必须先检查差异并手动合并必要变化。
- 修改 Radix 组件时保留 `asChild`、受控状态、焦点管理、键盘行为和无障碍属性。
- 样式优先使用 Tailwind 工具类、`src/lib/utils` 的 `cn` 和现有语义 Token；已有 Token 能表达语义时不要硬编码一次性颜色。
- 还原 Figma 设计时，如果设计与现有 shadcn 组件样式差异不大，且精确还原需要脆弱的覆盖、重复组件或明显增加维护成本，可以不追求像素级完全一致；优先保持设计意图、信息层级、交互、响应式、可访问性和组件系统一致性。
- 静态 Lucide 图标从 `@/components/icons` 按名称导入；需要新图标时先在该入口增加明确的 named export，不要在业务文件直接导入 `lucide-react`。
- 通用界面图标在适合项目现有视觉语言时优先使用 Lucide；若现有图标体系、Radix 基础组件内置图标或业务语义使用其他方案更合适，应在项目内保持一致，不为统一而强制迁移或新增依赖。禁止使用 Emoji、颜文字或其他文本符号代替界面图标。品牌 Logo、国旗、支付标识和供应商标识属于语义资产，不视为通用界面图标。没有动态 icon contract 时不要引入 Iconify、字符串图标解析器或第二套图标库。
- 新按钮能使用熟悉图标表达时使用 Lucide 图标，并给不熟悉的纯图标按钮提供 `aria-label` 和 `title`。
- TripGuru Logo 的 owner 是 `src/assets/logo.tsx`，品牌文案集中在 `src/config/app.ts`；没有明确品牌变更时不要替换或复制 Logo SVG。
- 保留键盘操作、焦点状态、ARIA 语义和 RTL。可复用布局优先使用 `ms-*`、`me-*`、`ps-*`、`pe-*`、`start-*`、`end-*`、`border-s`、`border-e` 等逻辑方向类。
- Admin 默认只要求桌面端实现和验收。只有用户明确要求时才增加移动端适配与移动视口验收。
- 不嵌套装饰性卡片；Dialog、Sheet 等浮层必须有可访问标题、必要说明、焦点管理和键盘关闭行为。

## 环境变量与本地开发

- 应用代码只能通过 `src/lib/env.ts` 读取环境配置；不要在功能组件直接读取 `import.meta.env` 或 `window.__ENV__`。
- 当前运行时变量为 `VITE_API_BASE_URL` 和 `VITE_APP_BASE_PATH`。Docker 启动时两者都必须存在且非空，根路径应显式传 `/`。
- `VITE_DEV_PORT` 只用于本地 Vite 开发，默认端口为 `5176`；它不是容器运行时注入项。容器监听端口使用 `APP_PORT`，默认 `3000`。
- 新增浏览器运行时 `VITE_*` 变量时，必须同时更新 `.env.example`、`src/vite-env.d.ts`、`public/env-config.js`、`src/lib/env.ts` 及相关测试。
- 一旦变量声明在 `public/env-config.js`，Docker entrypoint 会将它视为必填；不得为可选变量填入静默默认值绕过启动校验。
- 仅供 Vite 构建或本地开发使用的变量不要加入 `public/env-config.js`。
- 在 tg-server 启动开发服务时使用项目端口 `5176` 并监听 `0.0.0.0`；Mac 访问地址为 `http://192.168.0.115:5176`。

## Docker 与 Nginx

- 生产镜像由 `Dockerfile` 构建，并通过 `docker-entrypoint.sh` 在容器启动时生成运行时配置。
- `nginx.conf.template` 会在启动时经 `envsubst` 生成 `/etc/nginx/conf.d/default.conf`；不要用静态 `nginx.conf` 替代这一流程。
- entrypoint 会校验必填运行时变量、`APP_PORT` 和 base path，生成 `env-config.js`，并重写 `index.html` 的 `<base>`。
- 修改 base path、静态资源路径、Nginx fallback 或 env 注入时，必须同时验证根路径和非根路径部署。
- 保留 `/healthz`、SPA fallback、`env-config.js` 不缓存语义以及 Nginx 非 root 可读文件权限。
- 不在镜像构建阶段烘焙具体环境的 API 地址或凭据。

## CI/CD 与 GitOps

- CI/CD 和 GitOps 是项目交付基础设施，只在任务明确涉及构建、部署、发布或回滚时修改。
- 不得从其他项目复制 pipeline、GitOps path、应用名、环境变量或发布 tag 规则后直接启用；必须按当前项目和目标环境核验。
- 代码 push 只证明远程分支已更新。只有 pipeline、GitOps 和目标环境的运行时证据均完成核验后，才能声称已部署或已生效。
- 不得在普通页面、请求或重构任务中顺带修改 `.gitlab-ci.yml` 或 GitOps。

## 依赖、生成文件与代码质量

- 使用 pnpm 修改依赖和 lockfile，不手工编辑 `pnpm-lock.yaml`。
- `src/client/**` 由后端 OpenAPI 生成，禁止手工编辑；先更新后端契约和 `openapi.json`，再运行 `pnpm generate:client`。
- 引入依赖前先确认现有库无法合理完成需求；不要并存第二套路由、请求、表单、状态或组件系统。
- TypeScript 保持 strict，优先明确类型和类型导入，不使用 `any` 逃避契约。
- 不使用 `@ts-ignore`、关闭 lint 规则或扩大 ignore 范围掩盖问题；局部禁用必须说明第三方限制，并保持最小范围。
- `src/components/ui/**` 当前被 ESLint 和部分 Knip 检查忽略，修改这些文件时必须依靠调用点检查、测试和人工 diff，不能把工具通过当成充分证据。
- 有意保留的公共导出即使尚未被页面使用，也应以窄范围 `@public` 标记表达意图；不要为通过 Knip 把整个业务目录加入 ignore。
- 不提交 `dist`、coverage、Vitest screenshots、`.vitest-attachments`、本地 `.env` 或开发日志。
- 不顺手格式化、重命名或重构任务范围外的项目文件。

## 验证要求

- 所有 TypeScript/React 代码变更至少运行 `pnpm lint` 和最小相关测试。
- 修改共享组件、认证、请求层、路由、环境变量、构建或部署配置时运行完整 `pnpm test` 和 `pnpm build`。
- 格式敏感或跨文件变更运行 `pnpm format:check`。
- 新增、删除、移动或重命名导出、模块、路由、Hook、组件或依赖后运行 `pnpm knip`。
- 视觉或交互变更使用浏览器验证关键桌面视口，并按影响范围检查 light/dark、RTL、键盘和错误状态；没有移动端需求时不扩展移动验收。
- `pnpm test` 使用 Vitest Browser Mode 和 Playwright Chromium。若某个浏览器控制面失败，必须报告具体控制面和原因，不得笼统声称浏览器或 Playwright 不可用。
- 若沙箱禁止 Vitest 监听临时端口，应在获得相应执行权限后用原命令重跑，不要修改测试配置规避环境限制。
- 无法执行某项验证时，明确报告未运行的命令、原因和剩余风险。

## Git 交付

- 开始修改前检查 branch、dirty worktree 和远程目标，保留用户已有改动。
- 只 stage 当前任务文件，不用 `git add .` 吞入无关变更。
- 不使用 `git reset --hard`、`git checkout --`、force push 或 `--no-verify`，除非用户明确授权并理解影响。
- 用户说“推送”时，如有未提交的当前任务变更，先按业务关注点提交，再直接推送当前分支。
- 推送前运行与改动风险匹配的验证，推送后报告 commit 和实际远端结果；不得声称未验证的 CI、部署或运行时状态。
