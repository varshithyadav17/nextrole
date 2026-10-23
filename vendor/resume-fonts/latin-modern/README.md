# Latin Modern Roman subset for NextRole

This distribution contains three unmodified Latin Modern Roman OpenType fonts (internal font version 2.004): lmroman10 regular, bold and italic. The complete family is available at https://www.gust.org.pl/projects/e-foundry/latin-modern/ and https://ctan.org/pkg/lm . The upstream README and manifest identify the complete work; they are included unchanged. This subset is not the complete font family.

Copyright 2003–2021 B. Jackowski and J.M. Nowacki, on behalf of TeX Users Groups. GUST Font License / LPPL 1.3c or later; license texts are included. No font outlines were changed. lib/resume-serif-fonts.ts represents these exact bytes as base64; PDF output embeds these three fonts intact; the pinned CFF subsetter is unsuitable for them. The renderer corrects the font stream metadata through pdf-lib’s public object APIs. Noto fallback still uses subsets. NextRole maintains its renderer, not the upstream fonts. No upstream support or endorsement is implied.

Existing Noto Sans assets remain for legacy documents and supported character fallback. No remote font requests occur.

- lmroman10-bold.otf  SHA-256 102fe06c430a8b681b2bf6876b7cd967ae4d47b4b6b41d915eb7913b726d9fb1
- lmroman10-italic.otf  SHA-256 c1fce25075567bb8dbf2151658c3b442690041db17a2d49fc9e55905ea5b7169
- lmroman10-regular.otf  SHA-256 1aa18cfefa58132c52ce5de70db1fd1154201c19cd2b2cdaffba4906a33e6852
