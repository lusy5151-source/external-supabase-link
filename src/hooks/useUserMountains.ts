import { useMutation } from "@tanstack/react-query";
export interface CreateMountainInput { name_ko: string; height: number; region: string; difficulty: string; description?: string; lat?: number; lng?: number; image_url?: string; }
export function useUserMountains() {
  return { userMountains: [], userMountainsAsMountains: [], loading: true, createMountain: useMutation({ mutationFn: async (input: CreateMountainInput) => ({}) }), uploadMountainImage: async (file: File) => "" as string | null };
}
