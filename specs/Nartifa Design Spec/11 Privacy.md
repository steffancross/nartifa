# 11 Privacy

No wireframe — same layout as About (08).

Visitors send photos to the site, so two small pieces of text are needed **before the globe upload goes public**: a consent line on the upload form and a privacy page. Decided 2026-10-25 (moved out of "Deferred").

These drafts follow common practice for small Japanese sites (purpose of use, what is kept, how to ask for removal, outside services). They are not legal advice. If the artist wants certainty, a short review by a lawyer or 行政書士 is enough; the drafts keep that review small.

## Consent line on the upload form — Decided

- Sits directly above **Send** (07), `small`, `text-2`. "Privacy" is a link to `/privacy` (new tab on desktop, so the form isn't lost).
- **No checkbox.** Sending is the agreement; the line is right at the point of action. This keeps the form as short as the design wants. (Fallback if ever needed: a required checkbox with the same text.)

| | Draft |
| --- | --- |
| EN | By sending, you confirm you took this photo and agree to NARTIFA showing it on this site. Please don't share photos where people can be recognised. **Privacy** |
| JA | 送信すると、ご自身で撮影した写真であること、またNARTIFAが本サイトで公開することに同意したものとします。人物が特定できる写真はご遠慮ください。**プライバシー** |

## Privacy page — Decided

**URL** `/privacy`. Not in the menu (rule 4, spare). Linked from the consent line and from the bottom of About, next to the GeoNames credit (08).

**Layout:** as About — top bar, title, text `body` max 640px, section headings in `small` `text`, paragraphs 24px apart. "Last updated" in `label` `text-3` under the title.

**Content:** fixed text in the interface text files, like About. `{handle}` comes from `INSTAGRAM_HANDLE`. Steffan keeps it true to the build: if what the site stores changes, this page changes with it.

### Draft — EN

> **Privacy**
> Last updated: {date}
>
> This site is run by NARTIFA. {operator line — see Still open}
>
> **Sharing a photo**
> When you share a photo on the globe, we keep:
> - the photo — resized, with all hidden data (including location, camera and date) removed before it is stored
> - the city you chose
> - your comment, if you wrote one
> - the time it was sent
>
> We don't ask for your name, email or an account, and we never read your photo's location.
>
> **How it's used**
> NARTIFA checks every photo before it appears. Approved photos are shown on the globe with their city and comment. Photos are used only on this site. Photos that aren't shown are kept privately and never made public.
>
> **Removing a photo**
> To have a photo removed, message NARTIFA on Instagram (@{handle}) with the city and roughly when you sent it.
>
> **Spam protection**
> To prevent spam, we keep a scrambled form of your network address and a random ID saved in your browser for 24 hours, then delete them. They are never connected to your photo. Cloudflare Turnstile checks that uploads come from a person.
>
> **Cookies**
> - `lang` remembers your language choice.
> - `v` is set only when you share a photo, and is used only for the upload limit above.
>
> No advertising or tracking cookies.
>
> **Visit statistics**
> Cloudflare Web Analytics counts page visits without cookies and without identifying you.
>
> **Services we use**
> The site, its data and photos are hosted by Cloudflare, Inc. Turnstile and Web Analytics are also provided by Cloudflare.
>
> **Contact**
> Questions about privacy: message NARTIFA on Instagram (@{handle}).

### Draft — JA

> **プライバシー**
> 最終更新日：{日付}
>
> 本サイトはNARTIFAが運営しています。{運営者情報 — Still open 参照}
>
> **写真の投稿について**
> 地球儀に写真を投稿いただくと、次の情報を保存します。
> - 写真（縮小し、位置情報・撮影機器・撮影日時などの付加情報をすべて削除してから保存します）
> - 選択した都市
> - コメント（入力した場合）
> - 送信日時
>
> お名前・メールアドレス・アカウント登録は不要です。写真の位置情報を読み取ることはありません。
>
> **利用目的**
> 写真はすべてNARTIFAが確認してから公開します。公開した写真は、都市名・コメントとともに地球儀に表示します。写真は本サイトでのみ使用します。公開しない写真は非公開のまま保管します。
>
> **写真の削除**
> 削除をご希望の場合は、InstagramでNARTIFA（@{handle}）に、都市名とおおよその送信日時をお知らせください。
>
> **迷惑投稿の防止**
> 迷惑投稿を防ぐため、通信元（IPアドレス）を変換した値と、ブラウザに保存するランダムなIDを24時間保存し、その後削除します。これらを投稿写真と紐づけることはありません。また、Cloudflare Turnstileにより、投稿が人によるものかを確認しています。
>
> **Cookieについて**
> - `lang`：表示言語の選択を記憶します。
> - `v`：写真を投稿したときだけ保存され、上記の投稿数の制限にのみ使用します。
>
> 広告やトラッキングのためのCookieは使用しません。
>
> **アクセス解析**
> Cloudflare Web Analyticsにより、Cookieを使わず、個人を特定しない形でページの閲覧数を集計しています。
>
> **利用している外部サービス**
> 本サイト、データ、写真はCloudflare, Inc.のサービス上で管理しています。TurnstileとWeb AnalyticsもCloudflareが提供しています。
>
> **お問い合わせ**
> プライバシーに関するお問い合わせは、InstagramでNARTIFA（@{handle}）までご連絡ください。

## Still open (artist)

| Item | Why |
| --- | --- |
| **Use beyond the site?** Does the artist want to use visitor photos anywhere else (exhibitions, Instagram, print)? | The consent line and the "used only on this site" sentence say no. If yes, both must say so **before** the first upload. Permission can't be added afterwards for photos already sent |
| **Operator line.** How the artist appears as the site's operator | Japanese privacy law expects the operator's name and address to be available. Common options: state them, or "provided promptly on request" (お問い合わせいただければ遅滞なく回答します), which keeps a pseudonym public |
| Review of both drafts (JA especially) | Tone and wording are the artist's; the facts must stay as written |

## States

| State | Behavior |
| --- | --- |
| English missing | Show Japanese (rule 3) — but both drafts exist, so this shouldn't happen |
