import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, Mail, Clock, ShieldCheck, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="max-w-2xl mx-auto pb-24 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        뒤로가기
      </button>

      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-destructive/10 p-2.5">
          <Trash2 className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">계정 삭제 요청</h1>
          <p className="text-sm text-muted-foreground">회원 탈퇴 및 데이터 삭제 안내</p>
        </div>
      </div>

      {/* 삭제되는 데이터 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            삭제되는 데이터
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">
            계정 삭제 시 아래 데이터가 영구적으로 삭제됩니다.
          </p>
          <ul className="space-y-2 text-sm text-foreground">
            {[
              "프로필 정보 (닉네임, 프로필 사진, 자기소개)",
              "등산 일지 및 사진",
              "정상 인증 기록 및 사진",
              "친구 목록 및 친구 관계",
              "모임(그룹) 가입 정보 및 채팅 내역",
              "등산 계획 및 참여 기록",
              "챌린지 참여 및 달성 기록",
              "업적(뱃지) 획득 기록",
              "좋아요, 댓글, 저장 기록",
              "장비 목록 및 관련 데이터",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-destructive shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 보존 기간 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            법적 보존 기간
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            관련 법령에 따라 일부 데이터는 삭제 후에도 일정 기간 보존됩니다.
          </p>
          <div className="space-y-3">
            {[
              { label: "거래 기록", period: "5년", law: "전자상거래법" },
              { label: "접속 로그", period: "3개월", law: "통신비밀보호법" },
              { label: "분쟁 관련 기록", period: "3년", law: "전자상거래법" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.law}</p>
                </div>
                <span className="text-sm font-semibold text-primary">{item.period}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 처리 일정 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            처리 일정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</div>
                <div className="w-0.5 flex-1 bg-border mt-1" />
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-foreground">삭제 요청 접수</p>
                <p className="text-xs text-muted-foreground">요청 확인 후 처리가 시작됩니다.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</div>
                <div className="w-0.5 flex-1 bg-border mt-1" />
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-foreground">7일 이내 처리 시작</p>
                <p className="text-xs text-muted-foreground">요청일로부터 7일 이내에 삭제 절차가 시작됩니다.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center text-sm font-bold text-destructive">3</div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">30일 이내 완전 삭제</p>
                <p className="text-xs text-muted-foreground">모든 개인 데이터가 영구적으로 삭제됩니다. 이후 복구가 불가능합니다.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 삭제 방법 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">앱 내 삭제 방법</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-foreground list-decimal list-inside">
            <li>하단 메뉴에서 <strong>프로필</strong> 탭을 선택합니다.</li>
            <li><strong>설정</strong> 메뉴로 이동합니다.</li>
            <li><strong>계정 삭제</strong> 항목을 선택합니다.</li>
            <li>안내 사항을 확인한 후 <strong>삭제 요청</strong>을 완료합니다.</li>
          </ol>
        </CardContent>
      </Card>

      {/* 이메일 요청 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            이메일로 삭제 요청
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            앱 내에서 삭제가 어려운 경우, 아래 이메일로 요청하실 수 있습니다.
          </p>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-1">요청 이메일</p>
            <a
              href="mailto:lusy5151@gmail.com"
              className="text-sm font-semibold text-primary hover:underline"
            >
              lusy5151@gmail.com
            </a>
          </div>
          <div className="rounded-lg border border-border p-4 space-y-1">
            <p className="text-xs font-medium text-foreground">이메일에 포함할 내용:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 제목: [계정 삭제 요청]</li>
              <li>• 가입 시 사용한 이메일 주소{user ? `: ${user.email}` : ""}</li>
              <li>• 본인 확인을 위한 추가 정보 (닉네임 등)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
        <p className="text-xs text-destructive font-medium">
          ⚠️ 계정 삭제 후에는 데이터를 복구할 수 없습니다. 삭제 전 필요한 데이터를 반드시 백업해주세요.
        </p>
      </div>
    </div>
  );
};

export default DeleteAccountPage;
