import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    title: "제1조 (목적)",
    content: (
      <p>
        본 약관은 완등(이하 "회사")이 제공하는 등산 기록 및 커뮤니티 서비스(이하 "서비스")의 이용 조건 및 절차에 관한 사항을 규정합니다.
      </p>
    ),
  },
  {
    title: "제2조 (서비스 내용)",
    content: (
      <>
        <p>회사는 다음의 서비스를 제공합니다.</p>
        <ul className="ml-4 mt-2 list-disc space-y-1">
          <li>100대 명산 등산 기록 및 완등 관리</li>
          <li>등산 일지 작성 및 사진 업로드</li>
          <li>친구 추가 및 산악회 기능</li>
          <li>등산 계획 생성 및 공유</li>
          <li>정상 인증 및 리더보드</li>
          <li>챌린지 및 업적 시스템</li>
          <li>등산 관련 매거진 콘텐츠</li>
        </ul>
      </>
    ),
  },
  {
    title: "제3조 (회원 가입)",
    content: (
      <ul className="ml-4 list-disc space-y-1">
        <li>만 14세 이상이면 누구나 가입할 수 있습니다.</li>
        <li>이메일, 구글, 카카오 계정으로 가입할 수 있습니다.</li>
        <li>허위 정보로 가입한 경우 서비스 이용이 제한될 수 있습니다.</li>
      </ul>
    ),
  },
  {
    title: "제4조 (서비스 이용 규칙)",
    content: (
      <>
        <p>다음 행위는 금지됩니다.</p>
        <ul className="ml-4 mt-2 list-disc space-y-1">
          <li>타인의 개인정보 무단 수집 또는 도용</li>
          <li>허위 등산 기록 또는 정상 인증 조작</li>
          <li>타인을 비방하거나 명예를 훼손하는 게시물 작성</li>
          <li>음란, 폭력적 콘텐츠 게시</li>
          <li>서비스의 정상적인 운영을 방해하는 행위</li>
          <li>상업적 광고 또는 스팸 게시</li>
        </ul>
      </>
    ),
  },
  {
    title: "제5조 (게시물 관련)",
    content: (
      <ul className="ml-4 list-disc space-y-1">
        <li>이용자가 작성한 게시물의 저작권은 이용자에게 있습니다.</li>
        <li>회사는 서비스 운영 목적으로 게시물을 활용할 수 있습니다.</li>
        <li>규정 위반 게시물은 사전 통보 없이 삭제될 수 있습니다.</li>
      </ul>
    ),
  },
  {
    title: "제6조 (계정 관리)",
    content: (
      <ul className="ml-4 list-disc space-y-1">
        <li>계정 정보 관리 책임은 이용자에게 있습니다.</li>
        <li>계정 도용 의심 시 즉시 비밀번호를 변경하고 회사에 알려주세요.</li>
        <li>장기간 미이용 계정(1년 이상)은 별도 안내 후 삭제될 수 있습니다.</li>
      </ul>
    ),
  },
  {
    title: "제7조 (서비스 중단)",
    content: (
      <ul className="ml-4 list-disc space-y-1">
        <li>시스템 점검, 장애 등의 사유로 서비스가 일시 중단될 수 있습니다.</li>
        <li>중단 시 사전 공지를 원칙으로 하나, 불가피한 경우 사후 공지합니다.</li>
      </ul>
    ),
  },
  {
    title: "제8조 (면책 조항)",
    content: (
      <ul className="ml-4 list-disc space-y-1">
        <li>천재지변 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
        <li>이용자 간의 분쟁에 회사는 개입하지 않습니다.</li>
        <li>실제 등산 시 발생하는 안전사고에 대해 회사는 책임지지 않습니다.</li>
      </ul>
    ),
  },
  {
    title: "제9조 (약관 변경)",
    content: (
      <p>약관 변경 시 최소 7일 전에 앱 내 공지사항을 통해 안내합니다.</p>
    ),
  },
  {
    title: "제10조 (분쟁 해결)",
    content: (
      <p>
        본 약관과 관련한 분쟁은 대한민국 법률을 적용하며,
        <br />
        관할 법원은 회사 소재지 관할 법원으로 합니다.
      </p>
    ),
  },
];

const TermsOfServicePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F8FAED" }}>
      <div className="mx-auto max-w-2xl px-4 py-8 pb-24">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </button>

        <h1 className="text-2xl font-bold text-foreground">이용약관</h1>
        <p className="mt-1 text-xs text-muted-foreground/70">시행일: 2026년 3월 2일</p>

        <div className="mt-8 space-y-4">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                {section.title}
              </h2>
              <div className="text-sm leading-relaxed text-muted-foreground">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground/60">
          문의:{" "}
          <a href="mailto:lusy5151@gmail.com" className="text-primary hover:underline">
            lusy5151@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
