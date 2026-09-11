export const PLAN_ENTITLEMENTS={free:{aiInterviews:10,discoveryRuns:10,teamSeats:2,talentProfiles:100},pro:{aiInterviews:500,discoveryRuns:500,teamSeats:25,talentProfiles:10000}};
export function subscriptionPlan(record){return record?.status==='active'&&record?.plan==='pro'?'pro':'free'}
export function entitlementsFor(record){const plan=subscriptionPlan(record);return {plan,...PLAN_ENTITLEMENTS[plan],...(record?.entitlements||{})}}
