import { supabase } from "@/integrations/supabase/client";

type PushPayload = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function sendServerPush({ userId, title, body, data = {} }: PushPayload) {
  try {
    const { error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        user_id: userId,
        title,
        body,
        data,
      },
    });
    if (error) console.warn("[push] server push failed", error);
  } catch (error) {
    console.warn("[push] server push unavailable", error);
  }
}

export async function sendServerPushToMany(
  userIds: string[],
  payload: Omit<PushPayload, "userId">,
) {
  const targets = Array.from(new Set(userIds)).filter(Boolean);
  await Promise.allSettled(targets.map((userId) => sendServerPush({ userId, ...payload })));
}
