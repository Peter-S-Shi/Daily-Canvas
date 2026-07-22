import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { storesV2, storesV3, upgradeDataToV3, upgradeSettingsToV2 } from "./db";

const databaseName = "DailyCanvasMigrationTest";
afterEach(async () => { await Dexie.delete(databaseName); });

describe("Dexie schema migration", () => {
  it("preserves version 1 data and marks existing users as onboarded", async () => {
    const oldDb = new Dexie(databaseName); oldDb.version(1).stores(storesV2);
    await oldDb.table("settings").put({ id:"app",language:"en",theme:"system",weekStartsOn:1,reduceMotion:false });
    await oldDb.table("tasks").put({ id:"old-task",title:"Existing task",kind:"habit",category:"",color:"#f4a261",starred:false,archived:false,startDate:"2026-07-01",recurrence:{type:"daily"},stopReminderAtTarget:false,createdAt:"",updatedAt:"" }); oldDb.close();
    const newDb = new Dexie(databaseName); newDb.version(1).stores(storesV2); newDb.version(2).stores(storesV2).upgrade(upgradeSettingsToV2); await newDb.open();
    expect(await newDb.table("tasks").get("old-task")).toMatchObject({title:"Existing task"}); expect(await newDb.table("settings").get("app")).toMatchObject({dataVersion:2,onboardingComplete:true}); newDb.close();
  });

  it("migrates v2 categories and recurrence to Areas and fixed schedules without losing related records", async () => {
    const oldDb = new Dexie(databaseName); oldDb.version(2).stores(storesV2);
    const base={kind:"habit",category:"Health",color:"#2a9d8f",starred:false,archived:false,startDate:"2026-07-01",recurrence:{type:"daily"},stopReminderAtTarget:false,createdAt:"created",updatedAt:"updated"};
    await oldDb.table("tasks").bulkPut([{...base,id:"one",title:"Walk"},{...base,id:"two",title:"Stretch"}]);
    await oldDb.table("checkIns").put({id:"one:2026-07-02",taskId:"one",date:"2026-07-02",status:"done",updatedAt:""});
    await oldDb.table("dailyOrders").put({date:"2026-07-02",taskIds:["one","two"]}); await oldDb.table("journalEntries").put({date:"2026-07-02",content:"Kept exactly",updatedAt:""}); await oldDb.table("rewards").put({id:"reward",title:"Tea",trigger:"date",rewardDate:"2026-07-03",createdAt:""}); await oldDb.table("settings").put({id:"app",dataVersion:2,language:"en",theme:"system",weekStartsOn:1,reduceMotion:false,onboardingComplete:true}); oldDb.close();
    const newDb = new Dexie(databaseName); newDb.version(2).stores(storesV2); newDb.version(3).stores(storesV3).upgrade(upgradeDataToV3); await newDb.open();
    const areas=await newDb.table("areas").toArray(); const tasks=await newDb.table("tasks").toArray();
    expect(areas).toHaveLength(1); expect(areas[0]).toMatchObject({name:"Health",color:"#2a9d8f"}); expect(tasks.map((task)=>task.id)).toEqual(["one","two"]); expect(tasks[0]).toMatchObject({areaId:areas[0].id,colorOverride:"#2a9d8f",schedule:{mode:"fixed",recurrence:{type:"daily"}}});
    expect(await newDb.table("checkIns").get("one:2026-07-02")).toMatchObject({status:"done"}); expect(await newDb.table("dailyOrders").get("2026-07-02")).toMatchObject({taskIds:["one","two"]}); expect(await newDb.table("journalEntries").get("2026-07-02")).toMatchObject({content:"Kept exactly"}); expect(await newDb.table("rewards").get("reward")).toBeTruthy(); expect(await newDb.table("settings").get("app")).toMatchObject({dataVersion:3}); newDb.close();
  });
});
