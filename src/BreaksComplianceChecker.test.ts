import { describe, expect, it } from "vitest";
import { BreaksComplianceChecker } from "./BreaksComplianceChecker";
import { DailySchedule, TimeSlot } from "./models";

const maxDriveSec = 4.5 * 3600;
const singleBreakSec = 45 * 60;
const splitBreaks: [number, number] = [15 * 60, 30 * 60];

const slot = (slotType: TimeSlot["slotType"], durationSeconds: number): TimeSlot => ({
  slotType,
  durationSeconds
});

const day = (dayLabel: string, slotsSequence: TimeSlot[]): DailySchedule => ({
  day: dayLabel,
  slotsSequence
});

const checker = new BreaksComplianceChecker(maxDriveSec, singleBreakSec, splitBreaks);

describe("BreaksComplianceChecker - single day", () => {
  it("accepts a compliant schedule with a single break", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", 2 * 3600),
        slot("break", singleBreakSec),
        slot("drive", 2 * 3600),
        slot("rest", 9 * 3600)
      ])
    ];

    const infringements = checker.check(schedule);

    expect(infringements).to.be.empty;
  });

  it("flags a non-compliant schedule when driving exceeds max without a break", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", maxDriveSec + 60)
      ])
    ];

    const infringements = checker.check(schedule);

    expect(infringements).to.have.length(1);
    expect(infringements[0].offendingSlotIndex).to.equal(0);
    expect(infringements[0].day).to.equal("2026-02-01");
    expect(infringements[0].brokenRule).to.match(/Driver did not take a break/);
  });

  it("flags insufficient first part of a split break", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", 2 * 3600),
        slot("break", splitBreaks[0] - 60),
        slot("drive", 1 * 3600)
      ])
    ];

    const infringements = checker.check(schedule);
    expect(infringements).to.have.length(1);
    expect(infringements[0].brokenRule).to.include("1st break duration");
  });

  it("accepts a compliant schedule that hits the 4.5h boundary with a split break", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", maxDriveSec),
        slot("break", splitBreaks[0]),
        slot("drive", 30 * 60),
        slot("break", splitBreaks[1]),
        slot("drive", 60 * 60)
      ])
    ];

    expect(checker.check(schedule)).to.have.length(0);
  });
});

describe("BreaksComplianceChecker - multiple days", () => {
  it("returns no infringements when all days are compliant", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", 2 * 3600),
        slot("break", singleBreakSec),
        slot("drive", 1 * 3600),
        slot("rest", 8 * 3600)
      ]),
      day("2026-02-02", [
        slot("drive", 1 * 3600),
        slot("break", splitBreaks[0]),
        slot("drive", 2 * 3600),
        slot("break", splitBreaks[1]),
        slot("drive", 1 * 3600)
      ])
    ];

    expect(checker.check(schedule)).to.be.empty;
  });

  it("reports infringements only for non-compliant days", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", 2 * 3600),
        slot("break", singleBreakSec),
        slot("drive", 1 * 3600)
      ]),
      day("2026-02-02", [
        slot("drive", maxDriveSec + 120)
      ])
    ];

    const infringements = checker.check(schedule);
    expect(infringements).to.have.length(1);
    expect(infringements[0].day).to.equal("2026-02-02");
  });
});
