# MySpellingGame 用户需求、竞争判断与下一阶段路线图

> 更新时间：2026-08-27  
> 项目：MySpellingGame / myspellinggame.com  
> 当前阶段：已从“自定义拼写小游戏”进入“轻量级 spelling mastery SaaS”阶段。

---

# 1. 执行结论

当前产品已经完成上一轮路线图中大部分最关键的学习闭环：

- 自定义学校词表
- 学生免注册
- Assignment
- 自动评分
- 保存和复用词表
- 学生长期进度
- 错词同 Session 自动重练
- Magic Learner Link / 稳定学生身份
- 手工 Example Sentence
- Plus Curated Sentence Library
- Smart Review
- Today's Review
- 跨 Assignment 数据
- 跨日 Mastery 判定
- CSV / 班级错词统计
- Free → Plus 价值预览
- Stripe 订阅和 30 天试用

因此，旧文档中以下内容已经不应继续作为“待开发 P0”：

- 错词自动重练
- Pro/Plus Value Preview
- Magic Learner Link
- Manual Example Sentence
- Curated Sentence Library
- Today's Review
- 基础 Spaced Review
- 跨日 Mastery

下一阶段不应该继续横向堆普通小游戏，而应该继续围绕：

> **更少准备时间 + 更少账号摩擦 + 更有效的长期掌握 + 更容易处理真实学校词表**

展开。

---

# 2. 当前产品定位

## 推荐总定位

> **Turn any spelling list into personalized practice that remembers what each student misses.**

更短版本：

> **Paste the list. Share one link. Track mastery.**

教师版本：

> **Create one list. Share one link. No student accounts. Automatic grading. Track what still needs review.**

家长版本：

> **Practice this week's school words without the nightly spelling battle.**

---

# 3. 当前最值得保留的差异化

## 3.1 学生无需账号

这是当前最稳定的竞争优势之一。

当前路径：

```text
Teacher / Parent
→ 登录 Workspace
→ 创建 Assignment
→ 分享链接

Student
→ 打开链接
→ 无 Email
→ 无密码
→ 无独立账号
→ 开始练习
```

Magic Learner Link 已进一步解决 nickname 不稳定的问题，因此当前真正的价值不是简单的：

> no login

而是：

> **No student account, while still keeping stable long-term student progress.**

这个组合比单纯匿名小游戏更有价值。

---

## 3.2 无按学生收费

当前 Plus：

```text
$5.99 / month
$49.99 / year
Up to 150 student profiles
No per-student fee
```

相比大量教育 SaaS 的 seat / pupil licence 模式，这是非常直观的教师购买理由。

推荐持续突出：

> **One flat price. No per-student fees.**

---

## 3.3 自定义学校真实词表

这个需求依然真实，但已经不能单独作为护城河。

过去：

> “支持输入自己的 weekly spelling words”

本身就具有明显差异化。

现在越来越多竞品也已经提供：

- 自定义词表
- 拍照扫描学校词表
- 音频朗读
- 错词练习
- Mastered / Needs Review

因此：

> **Custom List 应被视为核心入口，而不是完整护城河。**

真正的组合优势应该是：

```text
学校真实词表
+
极低准备成本
+
学生免账号
+
稳定身份
+
错词自动重练
+
跨日复习
+
Mastery
+
低价格
```

---

# 4. 海外教师真实痛点

## 4.1 软件和登录太多

教师社区长期抱怨：

- 学校工具太多
- App 功能重复
- 学生需要记多个账号
- 学生忘密码
- 大量课堂时间花在登录问题上

对 MySpellingGame 的意义：

- 不要为了“专业感”强制学生注册
- 不要建立复杂 student account system
- Magic Learner Link 应继续作为主要方案
- 教师端保持一个 Workspace 即可

### 产品对应

已解决：

- [x] No Student Account
- [x] Magic Learner Link
- [x] Assignment Link

继续强化：

- [ ] Teacher Landing Page 明确突出“zero student accounts”
- [ ] Pricing 首屏持续突出 no per-student fee

---

## 4.2 教师没有额外时间

教师真正愿意付费的价值不是：

> “有 20 个小游戏。”

而是：

> “每周少花 20–30 分钟准备、念词、批改和整理错题。”

现实工作流中的时间消耗包括：

```text
准备每周单词
→ 创建练习
→ 给学生分发
→ 帮学生登录
→ 朗读
→ 批改
→ 找错词
→ 再给学生布置复习
```

MySpellingGame 已经压缩了后半段。

下一步应该继续压缩前半段。

---

## 4.3 班级水平差距大

教师通常面对：

```text
同一个班

Group A
→ remediation / easy

Group B
→ standard

Group C
→ challenge
```

旧方案要求创建 Assignment A / B / C，但缺少真正的班级分组和差异化列表。

### 尚未解决

- [ ] Student Groups
- [ ] Differentiated Lists
- [ ] 同一周词表的 Easy / Standard / Challenge 变体
- [ ] 一次发布给不同学生组

---

## 4.4 教师希望看到“下一步该做什么”

单纯报告：

```text
Emily accuracy = 72%
```

价值有限。

教师真正需要的是：

```text
Emily:
4 words need review today

Class:
7 students need review
3 words are causing most errors
```

目前 Today’s Review / Smart Review 已经向这个方向发展。

下一阶段应继续增强“actionable report”，而不是只增加统计图。

---

# 5. 海外家长真实痛点

## 5.1 必须练学校这周真正布置的单词

长期反复出现的需求：

> “学校发了一组 spelling words，我只想把这些词放进 App，让孩子练。”

因此继续坚持：

> **Bring your own school words.**

不要把产品主线改成完全预设的课程词表平台。

---

## 5.2 家长不想每天亲自念词

真实家庭场景：

```text
学校发词表
↓
晚上家长念一个词
↓
孩子写
↓
家长检查
↓
再念下一个
```

这种流程每天重复会带来明显负担。

MySpellingGame 已经解决大部分：

```text
输入词表
↓
系统朗读
↓
孩子自己输入
↓
自动评分
↓
错词重练
↓
历史保存
```

这是 Parent Landing Page 最值得强调的购买理由之一。

---

## 5.3 手动输入词表仍然有摩擦

现在：

```text
拿到学校 worksheet
↓
家长手打 10–20 个词
↓
开始练习
```

新竞品越来越多地将流程缩短为：

```text
拍照
↓
自动识别
↓
确认
↓
开始练习
```

因此 Photo / Screenshot Import 已从“可选功能”提升为下一阶段高优先级功能。

---

## 5.4 家长需要知道孩子到底有没有掌握

家长不一定需要复杂 dashboard。

更容易理解的是：

```text
12 words this week

8 mastered
3 learning
1 needs review
```

以及：

```text
Words still causing trouble:
because
friend
beautiful
```

目前后台已经有相关数据。

缺口主要是：

- 家长友好的展示
- 可分享页面
- 手机端一眼看懂
- 不要求家长进入完整教师 Workspace

---

# 6. 学生真实痛点

## 6.1 单词孤立朗读容易产生歧义

典型问题：

```text
their
there
they're

dog
dogs
dog's
```

只有语音而没有 context 时，学生可能根本不知道系统希望他拼哪个词。

当前已经加入 Example Sentence，因此该痛点基本被解决。

继续保持：

```text
word
→ example sentence
→ word
```

---

## 6.2 TTS / 口音可能听不清

海外用户可能遇到：

- US pronunciation
- UK pronunciation
- AU pronunciation
- 浏览器 TTS voice 差异
- 某些词机器发音不自然

当前产品还没有真正的 pronunciation selector。

后续可以考虑：

```text
Pronunciation
- US English
- UK English
- AU English
```

但优先级低于 Photo Import、Teacher/Parent Landing、Spelling Pattern。

---

## 6.3 “错了 → 看答案 → 下一题”容易形成挫败循环

旧版本存在：

```text
bananna ❌
↓
显示 banana
↓
Next
```

这个问题已经通过 missed-word retry 改善。

目前正确方向：

```text
错误
↓
短暂纠正
↓
隔几个词再次出现
↓
再次练习
↓
跨日复习
↓
Mastery
```

这一部分已经从产品弱点变成当前产品优势之一。

---

# 7. Homeschool / 教学法方面的新需求信号

## 7.1 只背单词，不教规律的问题

近年的教师和 homeschool 讨论持续出现一个问题：

> 每周随机给 10–20 个词，孩子可能只是记住这组词，而没有学会可以迁移到新词的 spelling pattern。

用户又往往不希望使用非常重的完整 phonics curriculum。

这给 MySpellingGame 一个新的产品机会：

> **不要做完整课程平台，而是做轻量 spelling pattern / morphology 辅助。**

例如：

```text
Weekly words:
played
jumped
looked

Pattern:
Past tense "-ed"
```

或者：

```text
receive
ceiling

Pattern:
-ie / -ei spelling pattern
```

目标不是重新发明完整 phonics curriculum，而是：

```text
用户自己的学校词表
↓
识别其中明显的 pattern
↓
给一个短规则
↓
继续原有 practice / review / mastery
```

这比单纯继续增加普通小游戏更容易形成学习效果差异。

---

# 8. 竞品变化带来的战略调整

## 8.1 “Custom List”正在成为基础能力

目前越来越多新产品主推：

- weekly school spelling list
- upload / scan sheet
- AI extraction
- practice
- review
- mastery

因此：

> “可以输入自己的词”仍然必要，但不够形成长期差异化。

---

## 8.2 AI Example Sentence 已经不够支撑一个独立高价 Pro

一些竞品已经开始提供 AI sentence suggestion。

所以不建议下一步马上建立：

```text
Plus
→ $5.99

Pro
→ $9.99
→ AI sentence only
```

AI 如果以后成为高阶套餐，应该形成一个完整的 preparation workflow：

```text
拍照导入
↓
OCR
↓
自动清理词表
↓
自动匹配 / 生成例句
↓
识别 spelling pattern
↓
生成不同难度
↓
自动安排 review
```

这种“完整自动化”才更有机会支撑高阶价格。

---

# 9. 当前代码完成情况

## 已完成

- [x] Anonymous custom spelling practice
- [x] Spelling Test
- [x] Typing Rain
- [x] Custom weekly words
- [x] No student accounts
- [x] Teacher / Parent Workspace
- [x] Saved Lists
- [x] Assignments
- [x] Student Profiles
- [x] Automatic grading
- [x] Long-term progress
- [x] Smart missed-word review
- [x] CSV
- [x] Group-wide missed-word statistics
- [x] Stripe subscription
- [x] 30-day trial
- [x] Free / Plus limits
- [x] Missed-word retry
- [x] Free → paid value preview
- [x] Stable learner identity / Magic Learner Link
- [x] Manual Example Sentence
- [x] Curated Sentence Library
- [x] Today's Review
- [x] Basic spaced review
- [x] Cross-day mastery evidence
- [x] Public SEO copy synchronized with current workspace features
- [x] `llms.txt`

---

## 尚未完成

- [ ] Parent-specific Landing Page
- [ ] Teacher-specific Landing Page
- [ ] Photo / Screenshot spelling-list import
- [ ] Lightweight Spelling Pattern / Morphology
- [ ] Student Groups
- [ ] Differentiated Lists
- [ ] Shareable Parent Progress Report
- [ ] US / UK / AU pronunciation selector
- [ ] AI preparation workflow
- [ ] Google Classroom integration
- [ ] Large game library
- [ ] Full phonics / curriculum platform

---

# 10. 新版开发优先级

# P0 — 立即处理

## P0.1 Sitemap Freshness

状态：

- [ ] 待修

问题：

当前 sitemap 仍依赖手工日期桶，真实页面在更新后 `<lastmod>` 可能没有同步。

目标：

- 每个页面的 lastmod 基于真实修改
- 不虚假刷新所有页面
- 保留 hreflang / canonical

具体实现由单独 Codex Prompt 处理。

---

## P0.2 IndexNow

状态：

- [ ] 待实现

原因：

- Bing 对当前项目已经具有实际价值
- IndexNow 实现成本低
- 可以更快通知 Bing 及参与协议的搜索引擎页面变化

目标：

- 正确 IndexNow key file
- 只提交真实新增 / 更新 canonical URL
- 不提交 teacher/admin/API/student-private routes
- 不破坏现有自动部署

具体实现由单独 Codex Prompt 处理。

---

## P0.3 Teacher Landing Page

状态：

- [ ] 待实现

推荐路由：

```text
/for-teachers
```

核心内容：

```text
Paste the list.
Share one link.
No student accounts.
Automatic grading.
Track what each student still needs to practice.
```

必须突出：

- No student accounts
- No passwords
- No per-student fees
- Up to 150 students
- Saved weekly lists
- Assignments
- Automatic grading
- Smart Review
- Today's Review
- Mastery

SEO Intent：

- spelling test for teachers
- custom spelling test for students
- weekly spelling assignment
- spelling practice without student accounts
- spelling progress tracker

---

## P0.4 Parent Landing Page

状态：

- [ ] 待实现

推荐路由：

```text
/for-parents
```

核心内容：

```text
Paste this week's school words.
We'll say them.
Your child practices independently.
You see what still needs work.
```

必须突出：

- school weekly spelling words
- parent does not need to read every word
- automatic grading
- missed-word retry
- Today’s Review
- no child email/password
- progress across the week

SEO Intent：

- spelling practice at home
- practice school spelling words
- spelling app with your own words
- weekly spelling words practice
- spelling test for kids at home

---

## P0.5 Photo / Screenshot → Spelling List

状态：

- [ ] 待实现

### MVP 流程

```text
Upload / take photo
↓
OCR extract words
↓
Show editable preview
↓
Parent/teacher confirms
↓
Create practice / saved list
```

### MVP 必须满足

- [ ] OCR 结果必须人工确认
- [ ] 允许删除误识别内容
- [ ] 允许补充漏词
- [ ] 不直接发布未经确认的 OCR
- [ ] 手机拍照流程可用
- [ ] 清楚说明图片是否上传服务器
- [ ] 有合理文件大小限制
- [ ] 有错误状态和重试

### 暂时不要做

- 自动识别复杂 worksheet 全部版式
- 自动理解所有作业指令
- 复杂手写 OCR
- 大型 document AI pipeline

先解决：

> “我有一张 spelling sheet，不想手打 20 个词。”

---

# P1 — 核心产品增强

## P1.1 Lightweight Spelling Pattern / Morphology

状态：

- [ ] 待实现

目标：

不要做完整 phonics curriculum。

做：

```text
用户自己的 weekly words
↓
识别常见 spelling pattern
↓
给一个非常短的 rule / hint
↓
保持原有 practice
↓
按 pattern 查看易错词
```

### MVP

- [ ] 建立一批高频 spelling patterns
- [ ] 一个词可匹配 0–N 个 pattern
- [ ] 默认不阻塞用户练习
- [ ] 规则必须短
- [ ] 不把 pattern 自动判断宣传成绝对语言规则
- [ ] 对无法匹配的词正常练习

第一阶段优先使用：

> curated rules

而不是强依赖实时 AI。

---

## P1.2 Differentiated Lists

状态：

- [ ] 待实现

目标：

```text
Class 3A

Group A
→ Easy

Group B
→ Standard

Group C
→ Challenge
```

### MVP

- [ ] Teacher 创建 Group
- [ ] Student Profile 可以属于 Group
- [ ] 一个 weekly list 可以创建不同难度变体
- [ ] 不要求学生注册
- [ ] Magic Learner Link 自动知道该学生对应哪个 Assignment
- [ ] Teacher 可以复制 Standard → Easy / Challenge 后再手工调整

第一阶段不需要 AI 自动生成难度。

---

## P1.3 Shareable Parent Progress Report

状态：

- [ ] 待实现

目标：

教师/家长可以获得一个简单只读页面：

```text
Emily — Weekly Spelling Progress

12 words
8 Mastered
3 Learning
1 Needs Review

Needs Review:
because
beautiful
```

### MVP

- [ ] read-only token URL
- [ ] 不需要登录
- [ ] URL 不暴露内部数据库 ID
- [ ] 不显示其他学生
- [ ] 可以失效 / 撤销
- [ ] 手机端友好
- [ ] 默认只显示必要学习信息
- [ ] 不显示教师内部管理数据

---

## P1.4 Pronunciation Locale

状态：

- [ ] 待实现

建议：

```text
Pronunciation:
US English
UK English
AU English
```

优先级不高于前三项。

注意：

浏览器 SpeechSynthesis 的 voice availability 不一致，因此必须：

- 有 fallback
- 不保证每台设备都有完全一样的 voice
- 不因为缺少指定 voice 导致练习无法开始

---

# P2 — 有数据后再做

## P2.1 AI Preparation Workflow

不要只做：

> Generate Example Sentence

应该最终形成：

```text
Photo
↓
OCR
↓
Clean words
↓
Example sentences
↓
Pattern hints
↓
Difficulty variants
↓
Assignment
```

AI 是提高准备效率的工具，而不是为了“产品里有 AI”。

---

## P2.2 Google Classroom

只有当真实教师用户持续要求以下功能时再做：

- roster sync
- assignment sync
- Google Classroom student mapping
- grade return

当前优先级低于：

- no-account workflow
- Photo Import
- differentiated lists
- reports

因为 Classroom integration 会明显增加：

- OAuth scope
- 权限审核
- API 维护
- roster 数据复杂度
- support 成本

---

# P3 — 暂时不优先

## P3.1 大量新小游戏

状态：

- [ ] 暂缓

理由：

成熟竞品已有大量游戏。

继续做大量普通小游戏：

- 工程量大
- 差异化弱
- 未必提高付费转化
- 容易偏离 mastery 路线

可以后续根据真实留存数据增加 1–2 个有明确学习目的的模式，而不是为了数量堆游戏。

---

## P3.2 完整 Phonics / Curriculum

状态：

- [ ] 暂缓

理由：

完整课程体系意味着：

- 内容制作量巨大
- 年级体系复杂
- 地区差异
- 教材差异
- 高持续维护成本

MySpellingGame 当前更合理的定位仍然是：

> **Bring your own school list.**

而不是：

> “替代完整英语 spelling curriculum。”

---

# 11. SEO 当前状态

## 已有基础

- [x] 独立 Title
- [x] Meta Description
- [x] Canonical
- [x] sitemap.xml
- [x] robots.txt
- [x] hreflang
- [x] x-default
- [x] English
- [x] Spanish
- [x] Brazilian Portuguese
- [x] French
- [x] Indonesian
- [x] Simplified Chinese
- [x] FAQ
- [x] About
- [x] Privacy
- [x] Pricing
- [x] Long-tail landing pages
- [x] OG / Twitter
- [x] Structured data
- [x] Extensionless canonical URLs
- [x] Public product copy reflects current workspace capabilities

技术 SEO 已经不是当前主要瓶颈。

---

# 12. SEO 下一步

## P0

- [ ] 修正 truthful sitemap `<lastmod>`
- [ ] IndexNow
- [ ] `/for-teachers`
- [ ] `/for-parents`

## P1

建立与真实产品机制有关的原创内容。

推荐页面：

### 1.

```text
/how-spelling-mastery-works
```

内容：

- 什么是 Learning
- 什么是 Needs Review
- 什么是 Mastered
- 为什么不能同一 Session 连对三次就直接算 Mastered
- 为什么需要跨日证据

---

### 2.

```text
/how-missed-word-review-works
```

解释：

```text
miss
→ correction
→ retry
→ later review
→ mastery
```

---

### 3.

```text
/spelling-practice-without-student-accounts
```

围绕：

- teacher login burden
- child privacy
- simple classroom use
- Magic Learner Link

---

### 4.

```text
/custom-spelling-test-vs-weekly-word-apps
```

重点不要做低质量“竞品踩一遍”的 SEO 文。

应该解释：

- fixed curriculum vs school-provided list
- anonymous practice vs account-based platform
- one-off test vs mastery tracking

---

# 13. GEO 当前状态

## 已有

- [x] `llms.txt`
- [x] crawlable public HTML
- [x] FAQ
- [x] About
- [x] explicit pricing
- [x] explicit product capabilities
- [x] canonical sources
- [x] structured public content

---

## GEO 战略

不要把重点放在：

- 不断修改 llms.txt
- AI 关键词堆积
- 专门制造给 LLM 看的隐藏内容

更应该增加：

> **只有这个产品自身才能权威回答的内容。**

例如：

```text
How My Spelling Game decides whether a word is mastered
```

这类内容有：

- 一手产品数据
- 明确规则
- 原创性
- 可引用性
- 可验证性

比泛泛的：

> “10 Best Ways to Improve Spelling”

更适合长期 GEO。

---

# 14. 商业套餐建议

## 当前阶段

建议继续保持：

```text
Free
Plus
```

而不是急着增加 Pro。

---

## Free

承担：

> acquisition / trial of product value

需要保留足够真实体验：

- custom words
- anonymous practice
- limited workspace
- limited student profiles
- limited assignments
- basic progress

---

## Plus

购买理由：

> save preparation time + track mastery

应持续强化：

- unlimited saved lists
- unlimited submissions
- 150 student profiles
- no per-student fee
- 365-day history
- smart review
- today's review
- curated sentences
- CSV
- class missed-word stats

---

## Pro

暂时不要创建。

只有当以下高阶能力实际形成完整价值后再考虑：

- OCR
- AI clean-up
- AI sentence generation
- pattern analysis
- difficulty differentiation
- automated preparation workflow

再考虑：

```text
Pro = teacher preparation automation
```

而不是：

```text
Pro = AI sentence
```

---

# 15. 下一阶段推荐执行顺序

```text
1. Sitemap freshness
2. IndexNow
3. Teacher Landing Page
4. Parent Landing Page
5. Photo / Screenshot Import
6. Lightweight Spelling Pattern / Morphology
7. Differentiated Lists
8. Parent Progress Report
9. Pronunciation Locale
10. 根据真实用户需求决定 AI Workflow
11. 根据真实学校用户需求决定 Google Classroom
```

---

# 16. 未来开发前的判断标准

每一个新功能都先问四个问题：

## 1. 是否减少成人准备时间？

如果：

> 能省教师/家长每周实际操作时间

优先级提高。

---

## 2. 是否提高真实学习效果？

如果能增强：

```text
correction
review
retention
mastery
transfer
```

优先级提高。

---

## 3. 是否破坏“学生免账号”？

如果某个功能必须要求：

```text
30 个学生
→ 30 个邮箱
→ 30 个密码
```

应谨慎。

---

## 4. 是否只是为了看起来功能多？

如果只是：

> “竞品有，所以我也要有。”

优先级降低。

---

# 17. 下一阶段需要关注的数据

不要只看注册量。

建议重点看：

## Acquisition

- Organic landing page sessions
- Parent vs Teacher landing conversion
- Anonymous practice starts
- Workspace signup conversion

## Activation

- 创建第一份 Saved List
- 创建第一份 Assignment
- 第一次学生提交
- 第一次生成 Review

## Learning Loop

- retry participation rate
- Today’s Review usage
- students with cross-day practice
- Mastered words per active learner
- repeated missed words

## Retention

- teacher returns next week
- saved list reused
- second assignment created
- third assignment created
- student returns through Magic Link

## Monetization

- Free → Plus
- trial start
- trial → paid
- monthly vs annual
- cancellation timing
- Plus users actually using Smart Review / Today’s Review

这些数据比“新增多少小游戏”更能决定下一步。

---

# 18. 当前最不应该做的事情

- [ ] 不为了 SEO 每周反复重写首页
- [ ] 不继续堆无目的关键词
- [ ] 不建立几十个低质量 AI SEO 页面
- [ ] 不马上开发大型 phonics curriculum
- [ ] 不马上开发 20 个小游戏
- [ ] 不为了数据稳定要求学生全部注册
- [ ] 不把 AI 例句单独包装成高价套餐
- [ ] 不过早做复杂 Google Classroom integration
- [ ] 不频繁改变产品核心定位

---

# 19. 当前产品最合理的护城河方向

长期应该逐渐形成：

```text
真实学校词表
+
极低导入成本
+
学生零账号
+
稳定 Student Identity
+
自动纠错
+
错词重练
+
跨日 Review
+
Mastery
+
Spelling Pattern
+
教师可执行报告
+
低 seat 成本
```

这比：

```text
我有多少小游戏
```

更难被普通免费小游戏站直接替代。

---

# 20. 研究来源与进一步验证入口

## 教师 / 家长 / Homeschool 社区

- Reddit Parenting  
  https://www.reddit.com/r/Parenting/

- Reddit Teachers  
  https://www.reddit.com/r/Teachers/

- Reddit ElementaryTeachers  
  https://www.reddit.com/r/ElementaryTeachers/

- Reddit Homeschool  
  https://www.reddit.com/r/homeschool/

部分相关讨论：

- Custom weekly spelling words  
  https://www.reddit.com/r/Parenting/comments/xjhjn2/

- Parent wants app to read words / track practice  
  https://www.reddit.com/r/Parenting/comments/1i2t1wl/

- Spelling app recommendations / pronunciation concerns  
  https://www.reddit.com/r/homeschool/comments/1djmyd1/

- Teachers overwhelmed by too many apps  
  https://www.reddit.com/r/Teachers/comments/1vxfwad/

- Teacher spelling/time constraints  
  https://www.reddit.com/r/ElementaryTeachers/comments/1npqc50/spelling_help/

---

## 主要竞品

- Spelling Shed  
  https://www.spellingshed.com/

- SpellQuiz  
  https://spellquiz.com/

- Spelling Stars  
  https://www.spellingstars.com/

- Beezy Spelling  
  https://beezyspelling.com/

- Spelly  
  https://spelly.net/

---

## SEO / Indexing

- Google Search sitemap documentation  
  https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

- Google AI / Search optimization guidance  
  https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

- Bing IndexNow  
  https://www.bing.com/indexnow/getstarted

- Bing Webmaster IndexNow documentation  
  https://www.bing.com/webmasters/help/indexnow-0z209wby

- IndexNow protocol  
  https://www.indexnow.org/

---

# 21. 最终 Checklist

## 立即

- [ ] Sitemap truthful lastmod
- [ ] IndexNow

## 获客层

- [ ] Teacher Landing Page
- [ ] Parent Landing Page

## 减少准备时间

- [ ] Photo / Screenshot Import

## 提升学习效果

- [ ] Lightweight Spelling Pattern / Morphology
- [ ] Differentiated Lists

## 提升留存和家校沟通

- [ ] Shareable Parent Progress Report
- [ ] Pronunciation Locale

## 数据验证后

- [ ] AI preparation workflow
- [ ] Google Classroom

## 暂缓

- [ ] 大量新小游戏
- [ ] 完整课程体系
- [ ] 单独为 AI Example Sentence 建 Pro 套餐

---

# 22. 当前一句话结论

> **MySpellingGame 现在已经不缺“能不能收费”的基础功能。下一阶段真正需要做的是把真实学校词表更快地导入，把学生免账号的低摩擦优势继续放大，并让 Review / Mastery 从后台功能变成用户一眼能理解和愿意付费的结果。**
