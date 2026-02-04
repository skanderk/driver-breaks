import { ArticleNumber, HorizonSchedule, Infringement } from "./models";

interface ComplianceChecker {
    /**
     * Checks if a driver schedule complies to a specific article of Regulation No 561/2006.
     * 
     * @param schedule Target horizon schedule.
     * @returns A collection of infrigments to target article. Empty
     * if schedule complies to said article. 
     */
    check(schedule: HorizonSchedule): Infringement[]

    /**
     * @returns The article covered by this compliance checker.
     */
    getArticle(): ArticleNumber;
}
