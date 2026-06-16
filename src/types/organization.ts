export type OrganizationType = 'TeachingInstitution' | 'Employer'
export type OrgMemberRole = 'OrgAdmin' | 'OrgManager' | 'OrgTeacher' | 'OrgEmployee' | 'OrgStudent'

export interface OrganizationSummary {
  id: string
  name: string
  slug: string
  type: OrganizationType
  logoUrl: string | null
  roleInOrg: OrgMemberRole
}

export interface Organization {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  website: string | null
  contactEmail: string | null
  type: OrganizationType
  ownerUserId: string
  ownerName: string
  ownerEmail: string
  platformFeePercent: number
  orgFeePercent: number
  isActive: boolean
  memberCount: number
  courseCount: number
  licenseCount: number
  createdAt: string
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  firstName: string
  lastName: string
  email: string
  profilePictureUrl: string | null
  role: OrgMemberRole
  externalReference: string | null
  joinedAt: string
  leftAt: string | null
  isActive: boolean
  inviteAccepted: boolean
}

export interface CreateOrganizationRequest {
  name: string
  type: OrganizationType
  description?: string
  website?: string
  contactEmail?: string
}

export interface UpdateOrganizationRequest {
  name: string
  description: string | null
  website: string | null
  contactEmail: string | null
  logoUrl: string | null
  platformFeePercent: number
  orgFeePercent: number
}

export interface InviteMemberRequest {
  email: string
  role: OrgMemberRole
  externalReference?: string
}

export interface InvitePreview {
  email: string
  organizationName: string
  organizationType: OrganizationType
  role: OrgMemberRole
  expiresAt: string | null
  needsPassword: boolean
}

export interface AcceptInviteRequest {
  token: string
  firstName: string
  lastName: string
  password: string
}

export interface AcceptInviteResponse {
  userId: string
  email: string
  organizationId: string
  organizationSlug: string
}
