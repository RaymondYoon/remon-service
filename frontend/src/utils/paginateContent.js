// 책 본문을 실제 렌더 높이 기준으로 페이지 단위로 나누는 DOM 유틸 (ReadPage / usePagination 전용)

function cleanContent(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[ \t]*[*-]{3,}[ \t]*$/gm, "")
    .replace(/^[ \t]*\.\.\.[ \t]*$/gm, "…")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function binarySearchSplit(probe, text, maxH, makeP) {
  let lo = 0, hi = text.length, best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    probe.innerHTML = "";
    probe.appendChild(makeP(text.slice(0, mid)));
    if (probe.offsetHeight <= maxH) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  let cut = best;
  if (cut > 0 && cut < text.length) {
    const sp = text.lastIndexOf(" ", cut);
    if (sp > 0) cut = sp;
  }
  return {
    front: text.slice(0, cut).trimEnd(),
    back: text.slice(cut).trimStart(),
  };
}

// 문단을 문장 단위로 분리 (마침표·느낌표·물음표·… 뒤 공백 기준)
function splitSentences(text) {
  return text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim().length > 0);
}

// 실제 .flip-page-content 높이(contentEl.clientHeight) 기준으로 페이지 분할
export function buildPagesByContentBox(content, contentEl) {
  if (!content || !contentEl) return [];

  const maxH = contentEl.clientHeight;
  if (maxH < 20) return [];

  const cleaned = cleanContent(content);
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length === 0) return [];

  const probe = document.createElement("div");
  probe.className = "read-page-probe";
  probe.style.width = "100%";
  contentEl.appendChild(probe);

  const makeP = (text) => {
    const el = document.createElement("p");
    el.className = "read-para";
    el.textContent = text;
    return el;
  };

  // probe를 items 배열 내용으로 재구성
  const rebuildProbe = (items) => {
    probe.innerHTML = "";
    items.forEach((item) => probe.appendChild(makeP(item)));
  };

  const pages = [];
  let current = [];
  const queue = [...paragraphs];

  while (queue.length > 0) {
    const para = queue.shift();
    probe.appendChild(makeP(para));

    if (probe.offsetHeight <= maxH) {
      current.push(para);
    } else {
      probe.removeChild(probe.lastChild);

      if (current.length === 0) {
        // 빈 페이지에서도 안 들어감 — 문자 단위 이진 탐색으로 분할
        const split = binarySearchSplit(probe, para, maxH, makeP);
        if (split.front.length > 0) {
          pages.push([split.front]);
          probe.innerHTML = "";
          current = [];
          if (split.back.length > 0) queue.unshift(split.back);
        } else {
          pages.push([para]);
          probe.innerHTML = "";
          current = [];
        }
      } else {
        // 현재 페이지에 내용이 있음 — 문장 단위로 쪼개서 빈 공간 채우기
        const sentences = splitSentences(para);
        let fittedCount = 0;

        if (sentences.length > 1) {
          for (let i = 1; i <= sentences.length; i++) {
            const partial = sentences.slice(0, i).join(" ");
            rebuildProbe([...current, partial]);
            if (probe.offsetHeight <= maxH) {
              fittedCount = i;
            } else {
              break;
            }
          }
        }

        if (fittedCount > 0 && fittedCount < sentences.length) {
          // 일부 문장만 현재 페이지에 들어감 — 현재 페이지 채우고 나머지는 다음 페이지로
          const frontText = sentences.slice(0, fittedCount).join(" ");
          const backText = sentences.slice(fittedCount).join(" ");
          current.push(frontText);
          pages.push([...current]);
          probe.innerHTML = "";
          current = [];
          if (backText.trim()) queue.unshift(backText);
        } else if (fittedCount === sentences.length) {
          // 문장 재결합 시 전체 들어감 (원본과 미세한 차이)
          current.push(sentences.join(" "));
          rebuildProbe(current);
        } else {
          // 한 문장도 안 들어감 — 현재 페이지 확정, 다음 페이지에서 재시도
          pages.push([...current]);
          probe.innerHTML = "";
          current = [];
          queue.unshift(para);
        }
      }
    }
  }

  if (current.length > 0) pages.push(current);
  contentEl.removeChild(probe);
  return pages;
}
