import { describe, expect, it } from "vitest";
import { calendarEvidenceFor, reflectionFor } from "./useWorkspaceNavigation";
import { anchoredWorkspaces, primaryWorkspaces, workspaceOf, workspaces, type SectionId } from "./workspaceModel";

describe("M11/M12 workspace information architecture", () => {
  it("exposes the M11/M12-active primary destinations in blueprint order, with Settings anchored", () => {
    expect(primaryWorkspaces.map((workspace) => workspace.id)).toEqual(["today", "inbox", "plan", "tasks", "reflect", "review"]);
    expect(anchoredWorkspaces.map((workspace) => workspace.id)).toEqual(["settings"]);
  });

  it("activates Timeline and the Shortcuts cheat sheet while keeping M13 destinations out of live navigation", () => {
    const sections = workspaces.flatMap((workspace) => workspace.sections.map((section) => section.id as string));
    expect(workspaceOf("inboxCaptures").id).toBe("inbox");
    expect(workspaceOf("timeline").id).toBe("plan");
    expect(workspaceOf("settingsShortcuts").id).toBe("settings");
    for (const deferred of ["onThisDay", "notifications", "aboutUpdates"]) {
      expect(workspaces.some((workspace) => workspace.id === deferred)).toBe(false);
      expect(sections).not.toContain(deferred);
    }
  });

  it("groups the existing surfaces under their frozen workspaces without renaming the domain", () => {
    expect(workspaceOf("floating").id).toBe("plan");
    expect(workspaceOf("calendar").id).toBe("plan");
    expect(workspaceOf("allTasks").id).toBe("tasks");
    expect(workspaceOf("areas").id).toBe("tasks");
    expect(workspaceOf("lifecycle").id).toBe("tasks");
    expect(workspaceOf("rewards").id).toBe("tasks");
    expect(workspaceOf("dailyReflection").id).toBe("reflect");
    expect(workspaceOf("meditations").id).toBe("reflect");
    expect(workspaceOf("periodReview").id).toBe("review");
  });

  it("owns each section exactly once so navigation cannot become ambiguous", () => {
    const sections = workspaces.flatMap((workspace) => workspace.sections.map((section) => section.id));
    expect(new Set(sections).size).toBe(sections.length);
  });

  it("keeps the existing appearance background slots attached to their surfaces", () => {
    const slotOf = (id: SectionId) => workspaces.flatMap((workspace) => workspace.sections).find((section) => section.id === id)?.backgroundSlot ?? "app";
    expect(slotOf("todayExecution")).toBe("today");
    expect(slotOf("calendar")).toBe("calendar");
    expect(slotOf("dailyReflection")).toBe("reflection");
    expect(slotOf("allTasks")).toBe("app");
  });

  it("routes the preserved context jumps to their frozen destinations", () => {
    expect(calendarEvidenceFor("2026-09-22")).toEqual({ section: "calendar", date: "2026-09-22" });
    expect(reflectionFor("2026-09-22")).toEqual({ section: "dailyReflection", date: "2026-09-22" });
  });
});
