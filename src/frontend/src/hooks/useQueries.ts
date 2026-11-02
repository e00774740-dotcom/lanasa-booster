import { createActor } from "@/backend";
import type { AutoSettings, FfPerfSettings } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const boostKeys = {
  stats: ["boostStats"] as const,
  list: ["boosts"] as const,
};

export const autoKeys = {
  settings: ["autoSettings"] as const,
};

export const refreshKeys = {
  settings: ["refreshSettings"] as const,
};

export const ffPerfKeys = {
  settings: ["ffPerfSettings"] as const,
};

export function useBoostStats() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: boostKeys.stats,
    queryFn: async () => {
      if (!actor) return null;
      return actor.getBoostStats();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useBoostList() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: boostKeys.list,
    queryFn: async () => {
      if (!actor) return [];
      return actor.listBoosts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRecordBoost() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.recordBoost();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: boostKeys.stats });
      void queryClient.invalidateQueries({ queryKey: boostKeys.list });
    },
  });
}

export function useResetBoosts() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.resetBoosts();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: boostKeys.stats });
      void queryClient.invalidateQueries({ queryKey: boostKeys.list });
    },
  });
}

export function useAutoSettings() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: autoKeys.settings,
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAutoSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveAutoSettings() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AutoSettings) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.saveAutoSettings(settings);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: autoKeys.settings });
    },
  });
}

export function useResetAutoSettings() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.resetAutoSettings();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: refreshKeys.settings });
      void queryClient.invalidateQueries({ queryKey: autoKeys.settings });
    },
  });
}

export function useFfPerfSettings() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: ffPerfKeys.settings,
    queryFn: async () => {
      if (!actor) return null;
      return actor.getFfPerfSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveFfPerfSettings() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: FfPerfSettings) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.saveFfPerfSettings(settings);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ffPerfKeys.settings });
    },
  });
}

export function useResetFfPerfSettings() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.resetFfPerfSettings();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ffPerfKeys.settings });
    },
  });
}

export function useRefreshSettings() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery({
    queryKey: refreshKeys.settings,
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAutoSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveRefreshSettings() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AutoSettings) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.saveAutoSettings(settings);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: refreshKeys.settings });
      void queryClient.invalidateQueries({ queryKey: autoKeys.settings });
    },
  });
}

export function useResetRefreshSettings() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.resetAutoSettings();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: refreshKeys.settings });
      void queryClient.invalidateQueries({ queryKey: autoKeys.settings });
    },
  });
}

/**
 * Marks the caller's account as activated with Shizuku, preserving every other
 * stored Auto setting. The activation itself happens on the device; the backend
 * only records the per-caller flag.
 */
export function useActivateShizuku() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: AutoSettings) => {
      if (!actor) throw new Error("El backend no está listo");
      return actor.saveAutoSettings({ ...settings, shizukuActive: true });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: refreshKeys.settings });
      void queryClient.invalidateQueries({ queryKey: autoKeys.settings });
    },
  });
}
