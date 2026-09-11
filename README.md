# 技能中文解释 · Skills CN Explain

在 Hermes 桌面端「技能与工具」页面，给每个技能（Skills）和工具集（Tools）的产品介绍下方，自动注入一块**中文解释**。专为看不懂英文技能描述的用户打造。

Injects a plain-Chinese explanation under every Skill and Tool entry on the Hermes desktop "Skills & Tools" page — for users who find the built-in English descriptions hard to parse.

## 它做什么 What it does

- 用 `MutationObserver` 监听详情区 DOM，按条目名称匹配内置中文词典
- 命中词典的条目，在介绍下方追加一块「中文解释」（带主题色左边框，深浅色自适应）
- 切换条目时同步更新解释内容，不残留上一条
- 状态栏「中文解释·开/关」芯片随时启停，状态持久化

## 安装 Install

**一键安装链接：**

<a href="hermes://plugin/install?repo=ylym235/skills-cn-explain&enable=1">Install in Hermes</a>

**手动安装：** 把 `plugin.js` 放入

```
Windows:      %LOCALAPPDATA%\hermes\desktop-plugins\skills-cn-explain\plugin.js
macOS/Linux:  ~/.hermes/desktop-plugins/skills-cn-explain/plugin.js
```

文件夹名必须等于插件 id（`skills-cn-explain`）。保存后几秒自动加载；未生效则 `Ctrl/Cmd+K` → **Reload desktop plugins**。

## 自定义词典 Customize

中文解释来自 `plugin.js` 顶部的 `CN` 字典（`英文名 → 中文解释`）。打开文件，按你的技能库增删条目即可——不在词典里的条目不注入任何内容。

The dictionary `CN` at the top of `plugin.js` maps display names to Chinese text. Edit it to cover your own skills/tools; unmatched entries are left untouched.

## 技术实现 Notes

- 纯 ESM 单文件，无构建；仅导入 `@hermes/plugin-sdk` 与 `react/jsx-runtime`
- 不导入 `react`（部分版本 `useState is not defined` 会崩渲染器），开关芯片用 DOM 直接更新
- 注入块用 `data-cn-explain` 标记，React 不会清除未跟踪节点；被重渲染移除时 observer 立即补回

## License

MIT
