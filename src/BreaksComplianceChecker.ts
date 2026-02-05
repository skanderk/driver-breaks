import { ComplianceChecker } from './ComplianceChecker'
import { ArticleNumber, DailySchedule, HorizonSchedule, Infringement } from './models'

export class BreaksComplianceChecker implements ComplianceChecker {

    private state: CheckerState;
    /**
     * We inject the durations in the constructor to make this compliance 
     * checker a bit more generic. Also this DI allows us to enforce some properties/assumptions 
     * on break durations in the constructor. 
     * 
     * @param maxDrivingDurationSec The maximum driving duration without taking a break.
     * @param singleBreakDurationSec The duration of a mandatory single break.
     * @param splitBreakDurations A pair representing the durations of a split break members.
     */
    public constructor(
        private readonly maxDrivingDurationSec: number,
        private readonly singleBreakDurationSec: number,
        private readonly splitBreakDurations: [number, number]) {

        this.isValidDuration(maxDrivingDurationSec);
        this.isValidDuration(singleBreakDurationSec);
        splitBreakDurations.forEach(d => this.isValidDuration(d));

        if (singleBreakDurationSec !== splitBreakDurations[0] + splitBreakDurations[1]) {
            throw new Error('Single break duration must be equal to the sum of split break durations');
        }


        // We assume that in split break, the first break is shorter (this is the case in Article 7).
        if (splitBreakDurations[0] > splitBreakDurations[1]) {
            throw new Error('First part of a split break must be shorter than the second part');
        }

        this.state = new CheckerState();
    }

    private isValidDuration(durationSec: number): void {
        if (!Number.isInteger(durationSec)) {
            throw new Error(`Duration must be an integer number of seconds, got ${durationSec}`);
        }

        // Maximum duration allowed, to be adjusted per business logic.
        const durationMaxValueSec = 10 * 3600;
        if (durationSec <= 0 || durationSec > durationMaxValueSec) {
            throw new Error(`durection must be in (0, ${durationMaxValueSec}], got ${durationSec}`);
        }
    }

    /**
     * 
     * @inheritdoc
     */
    public getArticle(): ArticleNumber {
        return new ArticleNumber(7);
    }

    /**
     * 
     * @inheritdoc
     */
    public check(schedule: HorizonSchedule): Infringement[] {
        let infringements: Array<Infringement> = [];

        for (const dailySchedule of schedule) {
            infringements = infringements.concat(this.checkDailyCompliance(dailySchedule));
        }

        return infringements;
    }

    private checkDailyCompliance(schedule: DailySchedule): Infringement[] {
        // Reset state before each compliance check.
        this.state = new CheckerState();

        for (let i = 0; i < schedule.slotsSequence.length; i++) {
            const currentSlot = schedule.slotsSequence[i];

            switch (currentSlot.slotType) {
                case 'drive':
                    this.onDrive(schedule, i);
                    break;
                case 'rest':
                    this.onRest();
                    break;
                case 'break':
                    this.onBreak(schedule, i);
            }
        }

        return this.state.infringements;
    }


    private onDrive(schedule: DailySchedule, slotIdx: number): void {
        const currentSlot = schedule.slotsSequence[slotIdx];
        this.state.drivingTime += currentSlot.durationSeconds;

        // We allow the driver to exceed maxDrivingDurationSec if they are taking a rest right afterwards.
        if (this.state.drivingTime > this.maxDrivingDurationSec && this.state.infringementReported === false &&
            (!this.isLastSlot(schedule, slotIdx) && schedule.slotsSequence[slotIdx + 1].slotType !== 'rest')) {
            this.state.infringements.push({
                articleNumber: this.getArticle(),
                day: schedule.day,
                brokenRule: `Driver did not take a break: drive time without a break ${this.state.drivingTime}`,
                offendingSlotIndex: slotIdx
            });
            this.state.infringementReported = true;
        }
    }

    private isLastSlot(schedule: DailySchedule, slotIndex: number): boolean {
        return slotIndex === schedule.slotsSequence.length - 1;
    }


    private onRest(): void {
        this.state.drivingTime = 0; // Just in case the rest happens in the middle of a daily schedule.
        this.state.infringementReported = false;
        this.state.takingSplitBreak = false;
    }

    private onBreak(schedule: DailySchedule, slotIndex: number): void {
        const curSlotDurationSec = schedule.slotsSequence[slotIndex].durationSeconds;

        if (curSlotDurationSec >= this.singleBreakDurationSec) {
            this.state.drivingTime = 0;
            this.state.infringementReported = false;
            this.state.takingSplitBreak = false;
        } else { // This is a split break
            if (!this.state.takingSplitBreak) {
                if (curSlotDurationSec >= this.splitBreakDurations[0]) {
                    this.state.takingSplitBreak = true;
                } else {
                    this.state.infringements.push({
                        articleNumber: this.getArticle(),
                        day: schedule.day,
                        brokenRule: `Driver took an insufficient split break: 1st break duration ${curSlotDurationSec}`,
                        offendingSlotIndex: slotIndex
                    });
                }
            } else { // The driver already took the first part of a split break and this is the second one.
                if (curSlotDurationSec >= this.splitBreakDurations[1]) {
                    this.state.drivingTime = 0;
                } else {
                    this.state.infringements.push({
                        articleNumber: this.getArticle(),
                        day: schedule.day,
                        brokenRule: `Driver took an insufficient split break: 2nd break duration ${curSlotDurationSec}`,
                        offendingSlotIndex: slotIndex
                    });

                    // We still reset drivingTime to allow the checker to recover from this infrigement and detect 
                    // other enfrigements down the road if any (think compilers trying to recover from an error 
                    // in order to detect other errors in the program).
                    this.state.drivingTime = 0;
                }

                this.state.takingSplitBreak = false; // Reset flag in either case.
                this.state.infringementReported = false;
            }
        }
    }
}


/**
 * Mutable per-day state used by `BreaksComplianceChecker` while scanning a schedule.
 * This tracks accumulated driving time, split-break progress, and collected infringements
 * so the checker can recover after reporting and continue analysis.
 */
class CheckerState {
    infringements: Array<Infringement> = [];

    drivingTime = 0; // Driving time since last break.
    takingSplitBreak = false; // true if the driver is taking a split break.
    infringementReported = false; // Prevents reporting the same infringement multiple times.
}
