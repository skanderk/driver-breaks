/**
 * Describes a timeslot in a driver's schedule.
 * - drive: The driver is driving during this time slot.
 * - wait: The driver is waiting at a customer site for the service time window to open.
 * - serviceCustomer: The driver is servicing a customer (loading/unloading goods) or waiting 
 * for the vehicle to loaded/unloaded.
 * - otherWork: Other type of work: paper work, fuelling vehicle...
 * - break: The driver is taking a mandatory break per article 7.
 * - rest: Daily rest period.   
 */
export type TimeSlotType = 'drive' | 'wait' | 'serviceCustomer' | 'otherWork' | 'break' | 'rest'; 

/**
 * An immutable slot in a daily schedule of a driver.
 */
export interface TimeSlot {
    readonly slotType: TimeSlotType 
    readonly durationSeconds: number
}

export interface DailySchedule {
    day: string,
    slotsSequence: TimeSlot[]
}

/**
 * The schedule of a driver over a horizon. 
 * @note We assume that a horizon covers a period shorter than one week as this first
 * iteration does not cover weekly rest periods...
 */
export  type HorizonSchedule = DailySchedule[];

/**
 * An infringement of regulations 561/2006.
 * - articleNumber: The number of the infringed article.
 * - brokenRule: The rule broken within this article (free form text).
 * - offendingDay: The day when this infringement was detected.
 * - offendingSlotIndex: The index on the offending time slot in the offending daily 
 * schedule. 
 */
export interface Infringement {
    articleNumber: ArticleNumber
    brokenRule: string
    day: string
    offendingSlotIndex: number  
}

/**
 * Implements a valid 561/2006 article number. 
 */
export class ArticleNumber {
    public constructor(readonly value: number) {
        // Note: Upper bound 29 might be lower as some articles cannot be enforced computationally.
        if (value <= 0 || value > 29) {
            throw new Error(`Invalid article number, expected a value in [1, 29], got ${value}`);
        }
    }
}
