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

describe("BreaksComplianceChecker - constructor", () => {
  it("throws if durations are invalid", () => {

    expect(() => new BreaksComplianceChecker(-5 * 3600, singleBreakSec, splitBreaks)).to.throw(/durection must be in/);
    expect(() => new BreaksComplianceChecker(maxDriveSec, 0, splitBreaks)).to.throw(/durection must be in/);
    expect(() => new BreaksComplianceChecker(maxDriveSec, singleBreakSec, [15 * 60, -1])).to.throw(/durection must be in/);
  });

  it("throws if the duration of the first part of a split break is not less than that of its second part", () => {

    expect(
      () => new BreaksComplianceChecker(maxDriveSec, singleBreakSec, [30 * 60, 15 * 60]))
      .to.throw(/First part of a split break must be shorter/);
  });

  it("throws if the durations of a split break parts do not add up to that of the single break", () => {

    expect(
      () => new BreaksComplianceChecker(maxDriveSec, singleBreakSec, [15 * 60, 20 * 60]))
      .to.throw(/Single break duration must be equal to the sum/);
  });
});


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

  it("accepts a long driving segment if followed by a rest period", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", 2 * 3600),
        slot("break", singleBreakSec),
        slot("drive", 2 * maxDriveSec),
        slot("rest", 9 * 3600)
      ])
    ];

    const infringements = checker.check(schedule);

    expect(infringements).to.be.empty;
  });


  it("flags a non-compliant schedule when driving exceeds max without a break", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", maxDriveSec + 60),
        slot("serviceCustomer", 20 * 60),
        slot("rest", 9 * 3600)
      ])
    ];

    const infringements = checker.check(schedule);

    expect(infringements).to.have.length(1);
    expect(infringements[0].offendingSlotIndex).to.equal(0);
    expect(infringements[0].day).to.equal("2026-02-01");
    expect(infringements[0].brokenRule).to.include("Driver did not take a break");
  });

  it("reports an infringement once and only once", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", maxDriveSec + 60),
        slot("drive", 10 * 60),
        slot("serviceCustomer", 20 * 60),
        slot("drive", maxDriveSec + 60)
      ])
    ];

    const infringements = checker.check(schedule);

    expect(infringements).to.have.length(1);
    expect(infringements[0].offendingSlotIndex).to.equal(0);
    expect(infringements[0].day).to.equal("2026-02-01");
    expect(infringements[0].brokenRule).to.include("Driver did not take a break");
  });


  it("accepts a compliant schedule with a split break", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", maxDriveSec - 35 * 60),
        slot("break", splitBreaks[0]),
        slot("drive", 30 * 60),
        slot("break", splitBreaks[1]),
        slot("drive", 60 * 60)
      ])
    ];

    const infringements = checker.check(schedule);

    expect(infringements).to.be.empty;
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

  it("flags insufficient second part of a split break", () => {
    const schedule = [
      day("2026-02-01", [
        slot("drive", 2 * 3600),
        slot("break", splitBreaks[0]),
        slot("drive", 1 * 3600),
        slot("break", splitBreaks[1] - 10),
      ])
    ];

    const infringements = checker.check(schedule);

    expect(infringements).to.have.length(1);
    expect(infringements[0].brokenRule).to.include("Driver took an insufficient split break: 2nd break");
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
        slot("drive", maxDriveSec + 120),
        slot("otherWork", 15 * 60),
        slot("rest", 10 * 3600)
      ])
    ];

    const infringements = checker.check(schedule);
    expect(infringements).to.have.length(1);
    expect(infringements[0].day).to.equal("2026-02-02");
  });
});
