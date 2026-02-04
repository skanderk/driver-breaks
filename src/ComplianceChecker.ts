import { ArticleNumber, HorizonSchedule, Infringement } from "./models";

export interface ComplianceChecker {
    /**
      * Checks if a driver schedule complies with a specific article of Regulation (EC) No 561/2006.
      *
      * By design, compliance checkers try to detect as many infringements as possible within
      * a schedule. As some infringements may be consequences of earlier ones, implementations
      * should attempt to "recover" after each infringement in order to continue the analysis.
      *
      * This is comparable to a compiler attempting to report as many relevant errors as possible
      * by recovering after each error instead of aborting on the first one.
      *
      * An alternative design would be to stop at the first infringement, which would simplify
      * implementations. The chosen approach depends on business requirements.
      *
      * @param schedule Target horizon schedule.
      * @returns A collection of infringements for the target article.
      *          Empty if the schedule complies with the article.
      */

    check(schedule: HorizonSchedule): Infringement[]

    /**
     * @returns The article covered by this compliance checker.
     */
    getArticle(): ArticleNumber;
}
