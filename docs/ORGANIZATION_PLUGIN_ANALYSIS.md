# Better Auth Organization Plugin Analysis & Supabase Port Assessment

## 📋 Executive Summary

**Can we port Better Auth organization functionality to Supabase?**
**✅ YES** - The organization plugin is primarily a **data model + API layer** built on top of standard database tables. Since both Better Auth and Supabase share the same PostgreSQL database, we can implement identical functionality by creating direct database queries and API endpoints.

---

## 🏗️ What Better Auth Organization Plugin Provides

### Core Features

#### 1. **Organization Management**
- Create, read, update, delete organizations
- Unique slug generation
- Logo storage
- Custom metadata (JSON)
- Payments customer ID integration

#### 2. **Member Management**
- Add/remove users from organizations
- Role-based access control (owner, admin, member)
- Multi-role support per user across different organizations
- Member listing and querying

#### 3. **Invitation System**
- Invite users by email to join organizations
- Specify role at invitation time
- Invitation expiration (TTL)
- Accept/reject invitation flow
- Email notifications (custom templates)
- Status tracking (pending, accepted, rejected, expired)

#### 4. **Session Context**
- Track "active organization" in user session
- Switch between personal account and organizations
- `activeOrganizationId` stored in session

#### 5. **Client API Methods**
```typescript
authClient.organization.list()                    // List all user's organizations
authClient.organization.getFullOrganization()     // Get org with members & invitations
authClient.organization.create()                  // Create new organization
authClient.organization.update()                  // Update org name, slug, logo, metadata
authClient.organization.delete()                  // Delete organization
authClient.organization.setActive()               // Set active organization in session
authClient.organization.inviteMember()            // Invite user to organization
authClient.organization.acceptInvitation()        // Accept invitation
authClient.organization.rejectInvitation()        // Reject invitation
authClient.organization.cancelInvitation()        // Cancel pending invitation
authClient.organization.updateMemberRole()        // Change member role
authClient.organization.removeMember()            // Remove member from org
```

#### 6. **Server API Methods**
```typescript
auth.api.getFullOrganization()                    // Server-side org fetch
auth.api.listOrganizations()                      // Server-side list user's orgs
```

---

## 🗄️ Database Schema

Better Auth uses these tables (already in your Prisma schema):

```prisma
Organization {
  id                 String   @id @default(cuid())
  name               String
  slug               String?  @unique
  logo               String?
  createdAt          DateTime
  metadata           String?  // JSON
  paymentsCustomerId String?
  members            Member[]
  invitations        Invitation[]
}

Member {
  id             String   @id @default(cuid())
  organizationId String
  userId         String
  role           String   // "owner" | "admin" | "member"
  createdAt      DateTime
  
  @@unique([organizationId, userId])
}

Invitation {
  id             String   @id @default(cuid())
  organizationId String
  email          String
  role           String?
  status         String   // "pending" | "accepted" | "rejected" | "expired"
  expiresAt      DateTime
  inviterId      String
}

Session {
  // ... existing fields
  activeOrganizationId String?  // Tracks which org is active
}
```

**Key Insight:** This is standard relational data. No Better Auth magic required!

---

## 🔌 How Better Auth Works Under the Hood

Better Auth's organization plugin is **NOT** auth-specific. It's essentially:

1. **Database queries** via Prisma adapter
2. **REST API endpoints** exposed through `auth.api.*`
3. **Client-side wrappers** via `organizationClient()` plugin
4. **Hooks** for custom logic (e.g., seat updates on member add/remove)

The plugin code:
- Creates database records
- Validates permissions (user must be owner/admin to invite)
- Sends email notifications via custom callbacks
- Returns structured data

---

## ✅ Porting to Supabase: Feasibility Analysis

### What We Need to Implement

Since **Supabase Auth doesn't have built-in organizations**, we need to:

#### 1. **Database Queries** (Direct to PostgreSQL)
   - ✅ Already have Prisma schema
   - ✅ Can use `@repo/database` package
   - ✅ Create queries matching Better Auth API signatures

#### 2. **API Endpoints** (Hono routes in `packages/api`)
   ```typescript
   // packages/api/src/routes/organizations.ts
   app.get('/organizations/list', authMiddleware, async (c) => {
     const userId = c.get('user').id;
     return db.organization.findMany({
       where: { members: { some: { userId } } }
     });
   });
   
   app.post('/organizations/create', authMiddleware, async (c) => {
     // Create org + add creator as owner
   });
   
   // ... etc
   ```

#### 3. **Client Adapter** (Supabase provider)
   ```typescript
   // packages/auth/providers/supabase/client.ts
   export const authClient: AuthClient = {
     // ... existing methods
     organization: {
       async list() {
         const res = await fetch('/api/organizations/list');
         return res.json();
       },
       // ... implement all methods
     }
   };
   ```

#### 4. **Server Helpers** (Already partially done)
   ```typescript
   // apps/web/modules/saas/auth/lib/server.ts
   // Runtime check for Better Auth vs implement via database
   if (auth.api?.getFullOrganization) {
     return auth.api.getFullOrganization(...);
   } else {
     // Direct database query for Supabase
     return db.organization.findUnique({ ... });
   }
   ```

---

## 🎯 Implementation Strategy

### Phase 1: Database Layer ✅ (Already Done)
- Prisma schema has all tables
- Database package exports queries

### Phase 2: API Routes (To Implement)
Create `packages/api/src/routes/organizations.ts`:

```typescript
import { authMiddleware } from '@repo/auth/providers/supabase/hono';
import { db } from '@repo/database';
import { Hono } from 'hono';

const app = new Hono()
  .use('*', authMiddleware)
  
  // List user's organizations
  .get('/list', async (c) => {
    const userId = c.get('user').id;
    const orgs = await db.member.findMany({
      where: { userId },
      include: { organization: true }
    });
    return c.json({ data: orgs.map(m => m.organization) });
  })
  
  // Get full organization (with members & invitations)
  .get('/full', async (c) => {
    const { organizationId, organizationSlug } = c.req.query();
    const org = await db.organization.findFirst({
      where: organizationId 
        ? { id: organizationId }
        : { slug: organizationSlug },
      include: {
        members: { include: { user: true } },
        invitations: { where: { status: 'pending' } }
      }
    });
    
    // Check if user is member
    const userId = c.get('user').id;
    const isMember = org?.members.some(m => m.userId === userId);
    if (!isMember) return c.json({ error: 'Unauthorized' }, 403);
    
    return c.json({ data: org });
  })
  
  // Create organization
  .post('/create', async (c) => {
    const { name, slug, logo, metadata } = await c.req.json();
    const userId = c.get('user').id;
    
    const org = await db.organization.create({
      data: {
        name,
        slug,
        logo,
        metadata: metadata ? JSON.stringify(metadata) : null,
        createdAt: new Date(),
        members: {
          create: {
            userId,
            role: 'owner',
            createdAt: new Date()
          }
        }
      }
    });
    
    return c.json({ data: org });
  })
  
  // Update organization
  .patch('/update', async (c) => {
    const { organizationId, data } = await c.req.json();
    const userId = c.get('user').id;
    
    // Check if user is owner/admin
    const member = await db.member.findUnique({
      where: { 
        organizationId_userId: { organizationId, userId }
      }
    });
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const org = await db.organization.update({
      where: { id: organizationId },
      data: {
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined
      }
    });
    
    return c.json({ data: org });
  })
  
  // Delete organization
  .delete('/delete', async (c) => {
    const { organizationId } = await c.req.json();
    const userId = c.get('user').id;
    
    // Check if user is owner
    const member = await db.member.findUnique({
      where: { 
        organizationId_userId: { organizationId, userId }
      }
    });
    
    if (member?.role !== 'owner') {
      return c.json({ error: 'Only owner can delete' }, 403);
    }
    
    await db.organization.delete({ where: { id: organizationId } });
    return c.json({ data: { success: true } });
  })
  
  // Set active organization (update session)
  .post('/set-active', async (c) => {
    const { organizationSlug, organizationId } = await c.req.json();
    // TODO: Update session's activeOrganizationId
    // This requires session management implementation
    return c.json({ data: { /* org */ } });
  })
  
  // Invite member
  .post('/invite', async (c) => {
    const { organizationId, email, role } = await c.req.json();
    const userId = c.get('user').id;
    
    // Check permissions
    const member = await db.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } }
    });
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    const invitation = await db.invitation.create({
      data: {
        organizationId,
        email,
        role: role || 'member',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        inviterId: userId
      }
    });
    
    // TODO: Send invitation email via @repo/mail
    
    return c.json({ data: invitation });
  })
  
  // Accept invitation
  .post('/accept-invitation', async (c) => {
    const { invitationId } = await c.req.json();
    const userId = c.get('user').id;
    
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId }
    });
    
    if (!invitation || invitation.status !== 'pending') {
      return c.json({ error: 'Invalid invitation' }, 400);
    }
    
    if (new Date() > invitation.expiresAt) {
      await db.invitation.update({
        where: { id: invitationId },
        data: { status: 'expired' }
      });
      return c.json({ error: 'Invitation expired' }, 400);
    }
    
    // Create member
    await db.member.create({
      data: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role || 'member',
        createdAt: new Date()
      }
    });
    
    // Update invitation
    await db.invitation.update({
      where: { id: invitationId },
      data: { status: 'accepted' }
    });
    
    // TODO: Update seats in subscription (call existing hook)
    
    return c.json({ data: { success: true } });
  })
  
  // Reject invitation
  .post('/reject-invitation', async (c) => {
    const { invitationId } = await c.req.json();
    
    await db.invitation.update({
      where: { id: invitationId },
      data: { status: 'rejected' }
    });
    
    return c.json({ data: { success: true } });
  })
  
  // Cancel invitation
  .post('/cancel-invitation', async (c) => {
    const { invitationId } = await c.req.json();
    const userId = c.get('user').id;
    
    const invitation = await db.invitation.findUnique({
      where: { id: invitationId },
      include: { organization: { include: { members: true } } }
    });
    
    // Check if user is owner/admin or inviter
    const member = invitation?.organization.members.find(m => m.userId === userId);
    const canCancel = 
      invitation?.inviterId === userId ||
      (member && ['owner', 'admin'].includes(member.role));
    
    if (!canCancel) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    await db.invitation.delete({ where: { id: invitationId } });
    return c.json({ data: { success: true } });
  })
  
  // Update member role
  .post('/update-member-role', async (c) => {
    const { organizationId, memberId, role } = await c.req.json();
    const userId = c.get('user').id;
    
    // Check if user is owner/admin
    const member = await db.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } }
    });
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    await db.member.update({
      where: { id: memberId },
      data: { role }
    });
    
    return c.json({ data: { success: true } });
  })
  
  // Remove member
  .post('/remove-member', async (c) => {
    const { organizationId, memberIdOrEmail } = await c.req.json();
    const userId = c.get('user').id;
    
    // Check permissions
    const member = await db.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } }
    });
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    
    await db.member.delete({
      where: { id: memberIdOrEmail }
    });
    
    // TODO: Update seats in subscription
    
    return c.json({ data: { success: true } });
  });

export default app;
```

### Phase 3: Client Adapter (Supabase)
Update `packages/auth/providers/supabase/client.ts` to add organization methods that call the API endpoints above.

### Phase 4: Update Unified Interface
Add organization methods to `packages/auth/types.ts`:

```typescript
export interface AuthClient {
  // ... existing methods
  organization: {
    list(): Promise<AuthResult<Organization[]>>;
    getFullOrganization(params: { query: { organizationId?: string; organizationSlug?: string } }): Promise<AuthResult<FullOrganization>>;
    create(params: { name: string; slug: string; logo?: string; metadata?: any }): Promise<AuthResult<Organization>>;
    update(params: { organizationId: string; data: Partial<Organization> }): Promise<AuthResult<Organization>>;
    delete(params: { organizationId: string }): Promise<AuthResult<void>>;
    setActive(params: { organizationSlug?: string; organizationId?: string | null }): Promise<AuthResult<Organization | null>>;
    inviteMember(params: { organizationId: string; email: string; role?: string }): Promise<AuthResult<Invitation>>;
    acceptInvitation(params: { invitationId: string }): Promise<AuthResult<void>>;
    rejectInvitation(params: { invitationId: string }): Promise<AuthResult<void>>;
    cancelInvitation(params: { invitationId: string }): Promise<AuthResult<void>>;
    updateMemberRole(params: { organizationId: string; memberId: string; role: string }): Promise<AuthResult<void>>;
    removeMember(params: { organizationId: string; memberIdOrEmail: string }): Promise<AuthResult<void>>;
  };
}
```

---

## 🚀 Benefits of This Approach

### 1. **Provider-Agnostic**
- App code doesn't care if it's Better Auth or Supabase
- Both implement same `AuthClient.organization` interface

### 2. **Full Control**
- We own the API logic
- Can customize permissions, validation, hooks

### 3. **No Vendor Lock-in**
- Not dependent on Better Auth plugin updates
- Can optimize queries for our use case

### 4. **Same Database**
- Both providers use same PostgreSQL tables
- No data migration needed
- Can even switch providers mid-project

---

## ⚠️ Challenges & Considerations

### 1. **Session Management**
- `setActive()` needs to update session's `activeOrganizationId`
- Supabase doesn't store custom session data by default
- **Solution:** Store in database, fetch on each request, or use JWT claims

### 2. **Email Notifications**
- Better Auth has built-in email hooks
- **Solution:** Already have `@repo/mail` package with templates

### 3. **Permission Enforcement**
- Better Auth validates automatically
- **Solution:** Add middleware checks in each API route

### 4. **Type Safety**
- Better Auth generates types from plugin config
- **Solution:** Define types in `@repo/auth/types.ts`

---

## 📊 Effort Estimation

| Task | Complexity | Time Estimate |
|------|-----------|---------------|
| API Routes (organizations.ts) | Medium | 4-6 hours |
| Client Adapter (Supabase) | Low | 2-3 hours |
| Update Type Definitions | Low | 1 hour |
| Server Helpers (Runtime Checks) | Low | 1 hour |
| Testing & Debugging | Medium | 3-4 hours |
| **Total** | - | **11-15 hours** |

---

## ✅ Recommendation

**YES, port the organization functionality to Supabase.**

### Why:
1. ✅ **Technically feasible** - Standard CRUD + permissions
2. ✅ **Provider-agnostic** - Works with both Better Auth and Supabase
3. ✅ **Already 80% there** - Database schema exists, app uses unified API
4. ✅ **No data loss** - Same database for both providers
5. ✅ **Better control** - Own the logic, no black box

### Implementation Order:
1. Create API routes in `packages/api/src/routes/organizations.ts`
2. Implement client adapter in `packages/auth/providers/supabase/client.ts`
3. Update type definitions in `packages/auth/types.ts`
4. Add runtime checks in server helpers
5. Test full flow: create org → invite member → accept → switch active org

---

## 📝 Next Steps

1. Review this document with team
2. Decide if organization feature is priority for Supabase support
3. If yes: Follow implementation strategy above
4. If no: Document that organization features require Better Auth provider

Would you like me to start implementing the API routes?

