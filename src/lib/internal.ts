/**
 * Internal views (pending-information lists, evidence notes) are shown only
 * in development builds. Production never renders them.
 */
export const INTERNAL_VIEW = process.env.NODE_ENV === "development";
