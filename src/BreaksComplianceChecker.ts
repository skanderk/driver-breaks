import { ComplianceChecker } from './ComplianceChecker'
import { ArticleNumber, DailySchedule, HorizonSchedule, Infringement } from './models'

export class BreaksComplianceChecker implements ComplianceChecker {
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
     * @returns @inheritdoc
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
        let infringements: Array<Infringement> = [];

        let drivingTime = 0; // Driving time since last break.
        let takingSplitBreak = false; // true if the driver is taking a split break.
        let infringementReported = false; // Prevents reporting the same infringement multiple times.

        for (let i = 0; i < schedule.slotsSequence.length; i++) {
            const currentSlot = schedule.slotsSequence[i];
            const curSlotDurationSec = currentSlot.durationSeconds;

            switch (currentSlot.slotType) {
                case 'drive':
                    drivingTime += curSlotDurationSec;

                    // We allow the driver to exceed maxDrivingDurationSec if they are taking a rest right afterwards.
                    if (drivingTime > this.maxDrivingDurationSec && infringementReported === false &&
                        (!this.isLastSlot(schedule, i) && schedule.slotsSequence[i + 1].slotType !== 'rest')) {
                        infringements.push({
                            articleNumber: this.getArticle(),
                            day: schedule.day,
                            brokenRule: `Driver did not take a break: drive time without a break ${drivingTime}`,
                            offendingSlotIndex: i
                        });
                        infringementReported = true;
                    }
                    break;
                case 'rest':
                    drivingTime = 0; // Just in case the rest happens in the middle of a daily schedule.
                    infringementReported = false;
                    takingSplitBreak = false;
                    break;
                case 'break':
                    if (curSlotDurationSec >= this.singleBreakDurationSec) {
                        drivingTime = 0;
                        infringementReported = false;
                    } else { // This is a split break
                        if (!takingSplitBreak) {
                            if (curSlotDurationSec >= this.splitBreakDurations[0]) {
                                takingSplitBreak = true;
                            } else {
                                infringements.push({
                                    articleNumber: this.getArticle(),
                                    day: schedule.day,
                                    brokenRule: `Driver took an insufficient split break: 1st break duration ${curSlotDurationSec}`,
                                    offendingSlotIndex: i
                                });
                            }
                        } else { // The driver already took the first part of a split break.
                            if (curSlotDurationSec >= this.splitBreakDurations[1]) {
                                drivingTime = 0;
                            } else {
                                infringements.push({
                                    articleNumber: this.getArticle(),
                                    day: schedule.day,
                                    brokenRule: `Driver took an insufficient split break: 2nd break duration ${curSlotDurationSec}`,
                                    offendingSlotIndex: i
                                });

                                // We still reset drivingTime to allow the checker to recover from this infrigement and detect 
                                // other enfrigements down the road if any (think compilers trying to recover from an error 
                                // in order to detect other errors in the program).
                                drivingTime = 0;
                            }

                            takingSplitBreak = false; // Reset flag in either case.
                            infringementReported = false;
                        }
                    }
            }
        }

        return infringements;
    }

    private isLastSlot(schedule: DailySchedule, slotIndex: number): boolean {
        return slotIndex === schedule.slotsSequence.length - 1;
    }
}
