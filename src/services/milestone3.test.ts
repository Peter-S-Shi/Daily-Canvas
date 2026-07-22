import { describe, expect, it } from "vitest";
import type { Area, CheckIn, QuotaSchedule, Task } from "../types";
import { resolveTaskColor } from "./areaService";
import { getQuotaPeriod, getQuotaProgress, getQuotaStreak } from "./quotaService";
import { isFloatingAvailableOn, isFloatingOverdue, isTaskScheduledOn } from "./scheduleService";
import { calculateTaskStats } from "./statisticsService";

const base: Task = { id:"task",title:"Example",kind:"habit",starred:false,archived:false,startDate:"2026-01-01",schedule:{mode:"fixed",recurrence:{type:"daily"}},stopReminderAtTarget:false,createdAt:"",updatedAt:"" };
const done = (date:string):CheckIn => ({id:`task:${date}`,taskId:"task",date,status:"done",updatedAt:""});

describe("Milestone 3 planning semantics", () => {
  it("inherits Area color unless the task has an explicit override", () => {
    const areas:Area[]=[{id:"health",name:"Health",color:"#123456",sortOrder:0,archived:false,createdAt:"",updatedAt:""}];
    expect(resolveTaskColor({...base,areaId:"health"},areas)).toBe("#123456");
    expect(resolveTaskColor({...base,areaId:"health",colorOverride:"#abcdef"},areas)).toBe("#abcdef");
  });

  it("keeps floating availability neutral and separates overdue from failure", () => {
    const task:Task={...base,kind:"task",schedule:{mode:"floating",availableFrom:"2026-07-01",optionalDeadline:"2026-07-10"}};
    expect(isFloatingAvailableOn(task,new Date("2026-06-30T12:00:00"))).toBe(false);
    expect(isFloatingAvailableOn(task,new Date("2026-07-02T12:00:00"))).toBe(true);
    expect(isFloatingOverdue(task,new Date("2026-07-11T12:00:00"))).toBe(true);
    expect(isTaskScheduledOn(task,new Date("2026-07-11T12:00:00"))).toBe(false);
    expect(calculateTaskStats(task,[],new Date("2026-07-20T12:00:00"))).toMatchObject({scheduled:0,completed:0,completionRate:0});
    expect(isFloatingAvailableOn(task,new Date("2026-07-12T12:00:00"),"2026-07-11")).toBe(false);
  });

  it("uses Monday and Sunday week boundaries", () => {
    const schedule={mode:"quota" as const,period:"week" as const,targetCount:1,availableFrom:"2026-01-01"};
    expect(getQuotaPeriod(schedule,new Date("2026-07-19T12:00:00"),1)).toMatchObject({start:"2026-07-13",end:"2026-07-19"});
    expect(getQuotaPeriod(schedule,new Date("2026-07-19T12:00:00"),0)).toMatchObject({start:"2026-07-19",end:"2026-07-25"});
  });

  it("handles month lengths, leap dates, unique daily credit, and provisional periods", () => {
    const schedule:QuotaSchedule={mode:"quota",period:"month",targetCount:2,availableFrom:"2024-01-01"}; const task:Task={...base,schedule};
    const feb=getQuotaPeriod(schedule,new Date("2024-02-29T12:00:00"),1); expect(feb).toMatchObject({start:"2024-02-01",end:"2024-02-29"});
    const duplicated=[done("2024-02-10"),{...done("2024-02-10"),id:"duplicate"},done("2024-02-29")];
    expect(getQuotaProgress(task,feb,duplicated,new Date("2024-02-20T12:00:00"))).toMatchObject({count:2,achieved:true,provisional:true,outcome:"achieved"});
    const partial=getQuotaProgress({...task,schedule:{...schedule,targetCount:4}},feb,[done("2024-02-10")],new Date("2024-02-20T12:00:00")); expect(partial).toMatchObject({count:1,provisional:true,outcome:"partial"});
    const closed=getQuotaProgress({...task,schedule:{...schedule,targetCount:4}},feb,[done("2024-02-10")],new Date("2024-03-01T12:00:00")); expect(closed).toMatchObject({provisional:false,outcome:"not-achieved"});
  });

  it("counts streaks by successful periods rather than successful days", () => {
    const task:Task={...base,schedule:{mode:"quota",period:"week",targetCount:2,availableFrom:"2026-01-01"}};
    const records=[done("2026-07-06"),done("2026-07-07"),done("2026-07-13"),done("2026-07-14")];
    expect(getQuotaStreak(task,records,new Date("2026-07-20T12:00:00"),1)).toBe(2);
  });
});
