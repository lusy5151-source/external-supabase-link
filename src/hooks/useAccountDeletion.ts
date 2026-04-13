import { useMutation } from "@tanstack/react-query";
export function useAccountDeletion() {
  return { pendingRequest: null, requestDeletion: useMutation({ mutationFn: async () => {} }), cancelDeletion: useMutation({ mutationFn: async () => {} }) };
}
