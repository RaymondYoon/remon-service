import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateBook } from "../api/bookApi";
import { getLemonInfo } from "../api/userApi";
import { useBookGeneration } from "../context/BookGenerationContext";
import { useToast } from "../hooks/useToast";
import LemonFall from "../components/LemonFall";
import LemonPanel from "../components/generate/LemonPanel";
import GenerateField from "../components/generate/GenerateField";
import ChipGroup from "../components/generate/ChipGroup";
import KeywordInput from "../components/generate/KeywordInput";
import NameListInput from "../components/generate/NameListInput";
import {
  GENRES, TONES, ENDINGS, VIEWPOINTS, PROTAGONIST_TRAITS,
  MAX_KEYWORDS, MAX_TONES, MAX_TRAITS, MAX_PROTAGONISTS, MAX_CHARACTERS,
} from "../components/generate/generateOptions";
import "./GeneratePage.css";

const GENRE_OPTIONS = GENRES.map((g) => ({ value: g, label: g }));
const TRAIT_OPTIONS = PROTAGONIST_TRAITS.map((t) => ({ value: t, label: t }));

const GeneratePage = () => {
  const navigate = useNavigate();
  const { startGeneration } = useBookGeneration();
  const showToast = useToast();

  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords]         = useState([]);
  const [genre, setGenre]               = useState(GENRES[0]);
  const [tones, setTones]               = useState(["WARM"]);
  const [ending, setEnding]             = useState("HAPPY");
  const [protagonistNames, setProtagonistNames] = useState([""]);
  const [characters, setCharacters]     = useState([]);
  const [synopsis, setSynopsis] = useState("");
  const [viewpoint, setViewpoint]             = useState("3인칭");
  const [protagonistTraits, setProtagonistTraits] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [lemonTrigger, setLemonTrigger] = useState(0);
  const [lemonInfo, setLemonInfo] = useState({ lemonCount: 3, maxDaily: 3, usedToday: 0 });

  useEffect(() => {
    getLemonInfo()
      .then((res) => setLemonInfo(res.data))
      .catch(() => {});
  }, []);

  const toggleTone = (value) => {
    if (tones.includes(value)) {
      if (tones.length > 1) setTones(tones.filter((t) => t !== value));
    } else {
      if (tones.length >= MAX_TONES) { showToast("최대 2개까지 선택 가능해요", "error"); return; }
      setTones([...tones, value]);
    }
  };

  const toggleTrait = (trait) => {
    if (protagonistTraits.includes(trait)) {
      setProtagonistTraits(protagonistTraits.filter((t) => t !== trait));
    } else {
      if (protagonistTraits.length >= MAX_TRAITS) { showToast("최대 3개까지 선택 가능해요", "error"); return; }
      setProtagonistTraits([...protagonistTraits, trait]);
    }
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim().replace(/,$/, "");
    if (!trimmed) return;
    if (keywords.length >= MAX_KEYWORDS) {
      setError("키워드는 최대 4개까지 입력할 수 있어요.");
      return;
    }
    if (keywords.includes(trimmed)) {
      setKeywordInput("");
      return;
    }
    setKeywords([...keywords, trimmed]);
    setKeywordInput("");
    setError("");
  };

  const removeKeyword = (kw) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const allKeywords = [...keywords];
    const trimmed = keywordInput.trim();
    if (trimmed && !allKeywords.includes(trimmed) && allKeywords.length < MAX_KEYWORDS) {
      allKeywords.push(trimmed);
    }

    if (allKeywords.length === 0) {
      setError("키워드를 1개 이상 입력해주세요.");
      return;
    }

    setLemonTrigger((prev) => prev + 1);
    setLoading(true);

    const validProtagonistNames = protagonistNames.map((n) => n.trim()).filter(Boolean);
    const validCharacters = characters.map((c) => c.trim()).filter(Boolean);

    try {
      const response = await generateBook({
        keywords: allKeywords,
        genre,
        tone: tones,
        ending,
        protagonistNames: validProtagonistNames.length > 0 ? validProtagonistNames : null,
        viewpoint,
        protagonistTrait: protagonistTraits.length > 0 ? protagonistTraits : null,
        synopsis: synopsis.trim() || null,
        characters: validCharacters.length > 0 ? validCharacters : null,
      });
      getLemonInfo()
        .then((res) => setLemonInfo(res.data))
        .catch(() => {});
      const bookId = response.data.id;
      startGeneration(bookId);
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || "책 생성 요청에 실패했습니다. 잠시 후 다시 시도해주세요.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="generate-container">
      <LemonFall trigger={lemonTrigger} />

      <LemonPanel lemonInfo={lemonInfo} />

      <div className="generate-header">
        <h1 className="generate-title">나만의 이야기 만들기</h1>
        <p className="generate-sub">키워드를 입력하면 Remon AI가 짧은 소설을 써드려요</p>
      </div>

      <form className="generate-form" onSubmit={handleSubmit}>

        <GenerateField label="키워드" hint="최대 4개 · Enter로 추가">
          <KeywordInput
            keywords={keywords}
            inputValue={keywordInput}
            onInputChange={setKeywordInput}
            onAdd={addKeyword}
            onRemove={removeKeyword}
          />
        </GenerateField>

        <GenerateField label="장르">
          <ChipGroup options={GENRE_OPTIONS} isActive={(v) => genre === v} onSelect={setGenre} />
        </GenerateField>

        <GenerateField label="분위기" hint="최대 2개 선택">
          <ChipGroup options={TONES} isActive={(v) => tones.includes(v)} onSelect={toggleTone} multi />
        </GenerateField>

        <GenerateField label="결말">
          <ChipGroup options={ENDINGS} isActive={(v) => ending === v} onSelect={setEnding} />
        </GenerateField>

        <GenerateField label="주인공 이름" hint="선택사항 · 최대 3명 · 비워두면 AI가 결정">
          <NameListInput
            names={protagonistNames}
            onChange={setProtagonistNames}
            max={MAX_PROTAGONISTS}
            minCount={1}
            placeholder="예: 지우, 하늘, Alex"
            addLabel="+ 주인공 추가"
          />
        </GenerateField>

        <GenerateField label="한 줄 시놉시스" hint="선택사항 · 이야기의 방향을 직접 제시">
          <textarea
            className="generate-synopsis-input"
            placeholder="예: 기억을 잃은 형사가 자신이 범인임을 깨닫는 이야기"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            maxLength={100}
          />
        </GenerateField>

        <GenerateField label="조연 등장인물" hint="선택사항 · 최대 4명">
          <NameListInput
            names={characters}
            onChange={setCharacters}
            max={MAX_CHARACTERS}
            placeholder="조연 이름"
            addLabel="+ 조연 추가"
          />
        </GenerateField>

        <GenerateField label="서술 시점">
          <ChipGroup options={VIEWPOINTS} isActive={(v) => viewpoint === v} onSelect={setViewpoint} />
        </GenerateField>

        <GenerateField label="주인공 성격" hint="선택사항 · 최대 3개 · 다시 누르면 해제">
          <ChipGroup options={TRAIT_OPTIONS} isActive={(v) => protagonistTraits.includes(v)} onSelect={toggleTrait} multi />
        </GenerateField>

        {error && <p className="generate-error">{error}</p>}

        <button
          type="submit"
          className="generate-submit-btn"
          disabled={loading || lemonInfo.lemonCount <= 0}
        >
          {loading ? "요청 중..." : "이야기 만들기 ✨"}
        </button>
      </form>
    </div>
  );
};

export default GeneratePage;
