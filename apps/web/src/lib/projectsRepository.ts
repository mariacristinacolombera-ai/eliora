import type { Project } from "../domain/Project";
import { normalizeProject } from "../domain/normalizeProject";
import { supabase } from "./supabase";

async function requireUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("User not authenticated");
  return user.id;
}

function normalizeForWrite(project: Project): Project {
  const result = normalizeProject(project);
  if (!result.ok) throw new Error("Project requires a usable ID and title.");
  if (result.issues.length) console.warn("Project write normalized with diagnostics.", { projectId: project.id, issues: result.issues });
  return result.project;
}

export async function loadProjects(): Promise<Project[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase.from("projects")
    .select("id, data, created_at").eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((row, rowIndex) => {
    const result = normalizeProject(row.data);
    if (result.issues.length) console.warn("Project JSON normalized with diagnostics.", { projectId: row.id, rowIndex, issues: result.issues });
    if (!result.ok) {
      console.error("Invalid Project JSON skipped during list load.", { projectId: row.id, rowIndex });
      return [];
    }
    if (row.id !== result.project.id || row.data.id !== result.project.id) {
      console.error("Project identity mismatch skipped during list load.", {
        projectId: row.id, rowIndex,
        issues: [{ path: "id", code: "project_identity_mismatch", message: "Row ID, payload ID and normalized ID must be identical." }],
      });
      return [];
    }
    return [result.project];
  });
}

export async function createProject(project: Project): Promise<Project> {
  const userId = await requireUserId();
  const normalized = normalizeForWrite(project);
  const { error } = await supabase.from("projects").insert({
    id: normalized.id, user_id: userId, data: normalized,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return normalized;
}

export async function updateProject(project: Project): Promise<Project> {
  const userId = await requireUserId();
  const normalized = normalizeForWrite(project);
  const { data, error } = await supabase.from("projects")
    .update({ data: normalized, updated_at: new Date().toISOString() })
    .eq("id", normalized.id).eq("user_id", userId).select("id").single();
  if (error) throw error;
  if (!data) throw new Error("Project not found");
  return normalized;
}

export async function deleteProject(projectId: string): Promise<void> {
  const canonicalId = projectId.trim();
  if (!canonicalId) throw new Error("Project requires a usable ID.");
  const userId = await requireUserId();
  const { error } = await supabase.from("projects").delete()
    .eq("id", canonicalId).eq("user_id", userId);
  if (error) throw error;
}
