export const PLAN_ENTITLEMENTS={free:{discoveryRuns:10,teamSeats:2,talentProfiles:100,jobSlots:1,discoveryCandidates:5},pro:{discoveryRuns:Infinity,teamSeats:25,talentProfiles:10000,jobSlots:Infinity,discoveryCandidates:Infinity}};
export function subscriptionPlan(record){return record?.status==='active'&&record?.plan==='pro'?'pro':'free'}
export function entitlementsFor(record){const plan=subscriptionPlan(record);return {plan,...PLAN_ENTITLEMENTS[plan],...(record?.entitlements||{})}}
