import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    title: "제1조 (수집하는 개인정보 항목)",
    content: (
      <>
        <p>회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
        <p className="mt-3 font-medium text-foreground">필수 항목:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>이름(닉네임), 이메일 주소, 비밀번호</li>
          <li>서비스 이용 기록, 접속 로그, 기기 정보</li>
        </ul>
        <p className="mt-3 font-medium text-foreground">선택 항목:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>프로필 사진, 지역 정보, 등산 스타일</li>
        </ul>
        <p className="mt-3 font-medium text-foreground">소셜 로그인 시:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>구글, 카카오에서 제공하는 이름, 이메일, 프로필 사진</li>
        </ul>
      </>
    ),
  },
  {
    title: "제2조 (개인정보 수집 및 이용 목적)",
    content: (
      <ul className="ml-4 list-disc space-y-1">
        <li>회원 가입 및 본인 확인</li>
        <li>등산 기록, 일지, 챌린지 서비스 제공</li>
        <li>친구 추가 및 산악회 기능 제공</li>
        <li>정상 인증 및 리더보드 운영</li>
        <li>서비스 개선 및 통계 분석</li>
        <li>공지사항 및 서비스 관련 안내 발송</li>
      </ul>
    ),
  },
  {
    title: "제3조 (개인정보 보유 및 이용 기간)",
    content: (
      <ul className="ml-4 list-disc space-y-1">
        <li>회원 탈퇴 시 즉시 삭제 (단, 관계 법령에 따라 일정 기간 보관)</li>
        <li>서비스 이용 로그: 3개월</li>
        <li>불만·분쟁 처리 기록: 3년 (전자상거래법)</li>
        <li>결제 기록: 5년 (전자상거래법)</li>
      </ul>
    ),
  },
  {
    title: "제4조 (개인정보의 제3자 제공)",
    content: (
      <p>
        회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
        <br />
        단, 법령에 의하거나 수사기관의 요청이 있는 경우는 예외로 합니다.
      </p>
    ),
  },
  {
    title: "제5조 (개인정보 처리 위탁)",
    content: (
      <ul className="ml-4 list-disc space-y-1">
        <li>Supabase Inc. — 데이터베이스 및 인증 서비스</li>
        <li>Lovable Technologies — 앱 호스팅 서비스</li>
        <li>Resend Inc. — 이메일 발송 서비스</li>
      </ul>
    ),
  },
  {
    title: "제6조 (이용자의 권리)",
    content: (
      <>
        <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
        <ul className="ml-4 mt-2 list-disc space-y-1">
          <li>개인정보 열람, 정정, 삭제 요청</li>
          <li>개인정보 처리 정지 요청</li>
          <li>계정 탈퇴 (앱 내 프로필 → 계정 탈퇴)</li>
        </ul>
      </>
    ),
  },
  {
    title: "제7조 (개인정보 보호책임자)",
    content: (
      <ul className="ml-4 list-disc space-y-1">
        <li>
          이메일:{" "}
          <a href="mailto:lusy5151@gmail.com" className="text-primary hover:underline">
            lusy5151@gmail.com
          </a>
        </li>
        <li>처리 기간: 요청일로부터 7일 이내</li>
      </ul>
    ),
  },
  {
    title: "제8조 (위치정보 수집 및 이용)",
    content: (
      <>
        <p>회사는 다음의 목적으로 이용자의 위치 정보를 수집·이용할 수 있습니다.</p>
        <p className="mt-3 font-medium text-foreground">수집 목적:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>주변 산 검색 및 추천</li>
          <li>등산 코스 안내 및 정상 인증</li>
          <li>날씨 정보 제공 (현재 위치 기반)</li>
        </ul>
        <p className="mt-3 font-medium text-foreground">수집 방법:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>이용자가 서비스 이용 시 직접 동의 후 수집</li>
          <li>GPS, Wi-Fi, 기지국 정보를 통해 수집</li>
        </ul>
        <p className="mt-3 font-medium text-foreground">보유 기간:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>서비스 이용 목적 달성 시 즉시 삭제</li>
          <li>등산 기록에 저장된 위치 정보는 이용자가 삭제 시 삭제</li>
        </ul>
        <p className="mt-3 font-medium text-foreground">동의 철회:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>기기 설정 → 앱 권한 → 위치 권한 해제로 언제든지 철회 가능</li>
          <li>위치 권한 미동의 시 일부 서비스 이용이 제한될 수 있습니다.</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground/70">
          관련 법령: 위치정보의 보호 및 이용 등에 관한 법률
        </p>
      </>
    ),
  },
  {
    title: "제9조 (개인정보 자동 수집 장치)",
    content: (
      <p>
        회사는 서비스 개선을 위해 쿠키 및 유사 기술을 사용할 수 있습니다.
        <br />
        이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.
      </p>
    ),
  },
];

const PrivacyPolicyPage = () => {
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

        <h1 className="text-2xl font-bold text-foreground">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          완등(이하 "회사")은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수합니다.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">시행일: 2026년 4월 2일</p>

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
          본 방침은 2026년 3월 2일부터 시행됩니다.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
