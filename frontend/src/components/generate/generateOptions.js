// AI 책 생성 옵션 (백엔드 GenerateBookRequest / 프롬프트 매핑과 값이 일치해야 함)

export const GENRES = ["SF", "판타지", "로맨스", "일상", "공포", "액션", "스릴러", "드라마", "느와르"];

export const TONES = [
  { value: "WARM",       label: "따뜻한" },
  { value: "DARK",       label: "어두운" },
  { value: "HUMOROUS",   label: "유쾌한" },
  { value: "MYSTERIOUS", label: "신비로운" },
  { value: "MELANCHOLY", label: "쓸쓸한" },
  { value: "TENSE",      label: "긴장감 있는" },
  { value: "EPIC",       label: "웅장한" },
  { value: "BRUTAL",     label: "잔혹한" },
  { value: "DREAMY",     label: "몽환적인" },
  { value: "CYNICAL",    label: "냉소적인" },
];

export const ENDINGS = [
  { value: "HAPPY", label: "해피엔딩" },
  { value: "SAD",   label: "새드엔딩" },
  { value: "OPEN",  label: "열린결말" },
];

export const VIEWPOINTS = [
  { value: "3인칭", label: "3인칭 (전지적 시점)" },
  { value: "1인칭", label: "1인칭 (내가 주인공)" },
];

export const PROTAGONIST_TRAITS = ["소심한", "까칠한", "비밀이 있는", "천재적인", "상처받은", "엉뚱한", "고집스러운", "순수한", "냉소적인", "외로운", "야망있는", "겁쟁이", "반항적인", "활발한", "긍정적인", "다정한", "유쾌한"];

export const MAX_KEYWORDS = 4;
export const MAX_TONES = 2;
export const MAX_TRAITS = 3;
export const MAX_PROTAGONISTS = 3;
export const MAX_CHARACTERS = 4;
