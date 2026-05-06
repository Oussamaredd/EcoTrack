import {
  ArrowRight,
  Compass,
  FileText,
  House,
  LifeBuoy,
  Map,
  Settings,
  Shield,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { isFeatureRouteEnabled, loadAppRuntimeConfig, type AppRuntimeConfig } from '../config/runtimeFeatures';
import { useCurrentUser } from '../hooks/useAuth';
import {
  hasAdminAccess,
  hasAgentAccess,
  hasCitizenAccess,
  hasManagerAccess,
  hasSupportWorkspaceAccess,
} from '../utils/authz';

type WorkspaceLink = {
  label: string;
  description: string;
  meta: string;
  to: string;
};

type RoleGuide = {
  eyebrow: string;
  title: string;
  description: string;
  links: WorkspaceLink[];
};

const buildSupportLink = (canAccessSupportWorkspace: boolean): WorkspaceLink =>
  canAccessSupportWorkspace
    ? {
        label: 'Support Workspace',
        description: 'Create, triage, and resolve support work from the shared operations surface.',
        meta: 'Shared operations',
        to: '/app/support',
      }
    : {
        label: 'Support',
        description: 'Open public support guidance and escalation help without entering the ticket workspace.',
        meta: 'Public help',
        to: '/support',
      };

const buildUniversalLinks = (canAccessSupportWorkspace: boolean): WorkspaceLink[] => [
  buildSupportLink(canAccessSupportWorkspace),
  {
    label: 'Settings',
    description: 'Review account details, sign-in methods, and session preferences.',
    meta: 'Account controls',
    to: '/app/settings',
  },
];

const managerLinks: WorkspaceLink[] = [
  {
    label: 'Manager Dashboard',
    description: 'Monitor the incoming queue, response pace, and operational pressure from the primary web workspace.',
    meta: 'Primary desktop lane',
    to: '/app/dashboard',
  },
  {
    label: 'Tour Planning',
    description: 'Turn citizen signals and supporting context into assignments, route coverage, and field readiness.',
    meta: 'Desktop planning',
    to: '/app/manager/planning',
  },
  {
    label: 'Manager Reports',
    description: 'Review trend reporting, export summaries, and monitor prototype output history.',
    meta: 'Desktop reporting',
    to: '/app/manager/reports',
  },
];

const agentLinks: WorkspaceLink[] = [
  {
    label: 'Agent Tour',
    description: 'Open the retained web companion for assigned routes, recovery, accessibility, or demos when mobile is not the active lane.',
    meta: 'Mobile-first role',
    to: '/app/agent/tour',
  },
];

const citizenLinks: WorkspaceLink[] = [
  {
    label: 'Citizen Reporting',
    description: 'Submit container issues into EcoTrack and keep citizen reporting visible as the core operational trigger.',
    meta: 'Mobile-first role',
    to: '/app/citizen/report',
  },
  {
    label: 'Impact & History',
    description: 'Review report status, resolved counts, prototype impact estimates, and personal participation history.',
    meta: 'Follow-up',
    to: '/app/citizen/profile',
  },
  {
    label: 'Challenges',
    description: 'Track goals, available programs, and participation progress without pretending points alone are the core value.',
    meta: 'Engagement',
    to: '/app/citizen/challenges',
  },
];

type ActiveRole = 'admin' | 'manager' | 'agent' | 'citizen' | 'shared';

type RoleHubPanel = {
  badgeLabel: string;
  heading: string;
  description: string;
  panelTitle: string;
  panelDescription: string;
  primaryLane: string;
  roleSplit: string;
  desktopPriority: string;
};

const adminLinks: WorkspaceLink[] = [
  {
    label: 'Admin Center',
    description: 'Manage access, governance defaults, and platform-wide control surfaces.',
    meta: 'Governance',
    to: '/app/admin',
  },
];

const buildRoleGuides = (options: {
  canAccessManager: boolean;
  canAccessAgent: boolean;
  canAccessCitizen: boolean;
  canAccessAdmin: boolean;
}) => {
  const guides: RoleGuide[] = [];

  if (options.canAccessManager) {
    guides.push({
      eyebrow: 'Operations lane',
      title: 'Manager control',
      description:
        'Managers use the primary web workspace for monitoring, planning, and reporting while citizen reports remain the core operational trigger.',
      links: managerLinks,
    });
  }

  if (options.canAccessAgent) {
    guides.push({
      eyebrow: 'Field lane',
      title: 'Agent execution',
      description:
        'Agents keep this host as a retained companion lane, but the main field-execution story stays mobile-first.',
      links: agentLinks,
    });
  }

  if (options.canAccessCitizen) {
    guides.push({
      eyebrow: 'Community lane',
      title: 'Citizen experience',
      description:
        'Citizen access stays focused on reporting first, then truthful follow-up and participation after submission.',
      links: citizenLinks,
    });
  }

  if (options.canAccessAdmin) {
    guides.push({
      eyebrow: 'Governance lane',
      title: 'Admin oversight',
      description:
        'Admins keep the primary web-only oversight lane alongside the operational access they already inherit.',
      links: adminLinks,
    });
  }

  return guides;
};

const collectRoleNames = (user: {
  role?: string | null;
  roles?: Array<{ name?: string | null }> | null;
} | null | undefined) => {
  const roleNames = new Set<string>();

  if (typeof user?.role === 'string' && user.role.trim()) {
    roleNames.add(user.role.trim());
  }

  if (Array.isArray(user?.roles)) {
    for (const role of user.roles) {
      if (typeof role?.name === 'string' && role.name.trim()) {
        roleNames.add(role.name.trim());
      }
    }
  }

  return Array.from(roleNames);
};

const normalizeRoleName = (roleName: string) => roleName.trim().toLowerCase();

const resolveActiveRole = (
  user: {
    role?: string | null;
    roles?: Array<{ name?: string | null }> | null;
  } | null | undefined,
  access: {
    canAccessManager: boolean;
    canAccessAgent: boolean;
    canAccessCitizen: boolean;
    canAccessAdmin: boolean;
  },
): ActiveRole => {
  const explicitRole = typeof user?.role === 'string' ? normalizeRoleName(user.role) : '';

  if ((explicitRole === 'admin' || explicitRole === 'super_admin') && access.canAccessAdmin) {
    return 'admin';
  }

  if (explicitRole === 'manager' && access.canAccessManager) {
    return 'manager';
  }

  if (explicitRole === 'agent' && access.canAccessAgent) {
    return 'agent';
  }

  if (explicitRole === 'citizen' && access.canAccessCitizen) {
    return 'citizen';
  }

  if (access.canAccessAdmin) {
    return 'admin';
  }

  if (access.canAccessManager) {
    return 'manager';
  }

  if (access.canAccessAgent) {
    return 'agent';
  }

  if (access.canAccessCitizen) {
    return 'citizen';
  }

  return 'shared';
};

const roleHubPanels: Record<ActiveRole, RoleHubPanel> = {
  citizen: {
    badgeLabel: 'EcoTrack citizen hub',
    heading: 'Open citizen reporting when you are ready.',
    description:
      'This shared authenticated surface keeps the citizen lane lightweight after sign-in. Start with one mapped-container report, then open history, challenges, or support only when you need live product data.',
    panelTitle: 'Citizen lane guidance',
    panelDescription:
      'Mobile remains the primary citizen experience; this web host stays available as the companion path.',
    primaryLane: 'Citizen experience',
    roleSplit: 'Citizen companion web',
    desktopPriority: 'Citizen/agent companion',
  },
  manager: {
    badgeLabel: 'EcoTrack manager hub',
    heading: 'Coordinate the right EcoTrack lane.',
    description:
      'This shared authenticated surface routes managers toward monitoring, planning, and reporting while keeping citizen reports visible as the operational signal that starts the loop.',
    panelTitle: 'Manager routing',
    panelDescription:
      'Managers use the web workspace first for coordination, planning, and operational review.',
    primaryLane: 'Manager control',
    roleSplit: 'Manager web-first',
    desktopPriority: 'Manager/admin web-first',
  },
  agent: {
    badgeLabel: 'EcoTrack agent hub',
    heading: 'Enter the field companion lane.',
    description:
      'This shared authenticated surface keeps agent web access available for assigned-route recovery, demos, and accessibility while field execution remains mobile-first.',
    panelTitle: 'Agent routing',
    panelDescription:
      'Agents keep this web host as a retained companion surface, not the primary field-execution lane.',
    primaryLane: 'Agent execution',
    roleSplit: 'Agent companion web',
    desktopPriority: 'Citizen/agent companion',
  },
  admin: {
    badgeLabel: 'EcoTrack admin hub',
    heading: 'Govern the right EcoTrack lane.',
    description:
      'This shared authenticated surface routes admins toward oversight and governance while preserving access to the role lanes they may need to inspect.',
    panelTitle: 'Admin routing',
    panelDescription:
      'Admins use the web workspace first for governance, configuration, and role-aware oversight.',
    primaryLane: 'Admin oversight',
    roleSplit: 'Manager/admin web-first',
    desktopPriority: 'Manager/admin web-first',
  },
  shared: {
    badgeLabel: 'EcoTrack role hub',
    heading: 'Enter the right EcoTrack lane.',
    description:
      'This shared authenticated surface routes each account into the right part of the prototype and keeps support and settings available when no product role is assigned yet.',
    panelTitle: 'Session routing',
    panelDescription:
      'This host stays honest about which roles are mobile-first and which roles are web-first.',
    primaryLane: 'Shared operations',
    roleSplit: 'Shared workspace',
    desktopPriority: 'Citizen/agent companion',
  },
};

const resolveFirstName = (user: {
  displayName?: string | null;
  name?: string | null;
  email?: string | null;
} | null | undefined) => {
  const candidates = [user?.displayName, user?.name];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue;
    }

    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    return trimmed.split(/\s+/)[0] ?? 'there';
  }

  if (typeof user?.email === 'string') {
    const emailPrefix = user.email.trim().split('@')[0];
    if (emailPrefix) {
      return emailPrefix;
    }
  }

  return 'there';
};

const filterRuntimeLinks = (links: WorkspaceLink[], runtimeConfig: AppRuntimeConfig) =>
  links.filter((link) => isFeatureRouteEnabled(link.to, runtimeConfig));

const renderRouteIcon = (route: string, size = 16) => {
  if (route === '/app/support' || route === '/support') {
    return <LifeBuoy size={size} aria-hidden="true" />;
  }

  if (route === '/app/settings') {
    return <Settings size={size} aria-hidden="true" />;
  }

  if (route === '/app/dashboard' || route.startsWith('/app/manager')) {
    return <Map size={size} aria-hidden="true" />;
  }

  if (route.startsWith('/app/agent')) {
    return <Truck size={size} aria-hidden="true" />;
  }

  if (route.startsWith('/app/citizen')) {
    return <FileText size={size} aria-hidden="true" />;
  }

  if (route.startsWith('/app/admin')) {
    return <Shield size={size} aria-hidden="true" />;
  }

  return <House size={size} aria-hidden="true" />;
};

const buildPriorityActions = (options: {
  canAccessManager: boolean;
  canAccessAgent: boolean;
  canAccessCitizen: boolean;
  canAccessAdmin: boolean;
  universalLinks: WorkspaceLink[];
}) => {
  const actions = [...options.universalLinks];

  if (options.canAccessManager) {
    actions.push(managerLinks[0]);
  }

  if (options.canAccessAgent) {
    actions.push(agentLinks[0]);
  }

  if (options.canAccessCitizen) {
    actions.push(citizenLinks[0]);
  }

  if (options.canAccessAdmin) {
    actions.push(adminLinks[0]);
  }

  return actions.slice(0, 4);
};

export default function AppHomePage() {
  const { user } = useCurrentUser();
  const runtimeConfig = loadAppRuntimeConfig();
  const canAccessManager = hasManagerAccess(user);
  const canAccessAgent = hasAgentAccess(user);
  const canAccessCitizen = hasCitizenAccess(user);
  const canAccessAdmin = hasAdminAccess(user);
  const canAccessSupportWorkspace = hasSupportWorkspaceAccess(user);
  const universalLinks = buildUniversalLinks(canAccessSupportWorkspace);
  const roleGuides = buildRoleGuides({
    canAccessManager,
    canAccessAgent,
    canAccessCitizen,
    canAccessAdmin,
  })
    .map((guide) => ({
      ...guide,
      links: filterRuntimeLinks(guide.links, runtimeConfig),
    }))
    .filter((guide) => guide.links.length > 0);
  const priorityActions = filterRuntimeLinks(
    buildPriorityActions({
      canAccessManager,
      canAccessAgent,
      canAccessCitizen,
      canAccessAdmin,
      universalLinks,
    }),
    runtimeConfig,
  );
  const roleNames = collectRoleNames(user);
  const firstName = resolveFirstName(user);
  const activeRole = resolveActiveRole(user, {
    canAccessManager,
    canAccessAgent,
    canAccessCitizen,
    canAccessAdmin,
  });
  const roleHubPanel = roleHubPanels[activeRole];
  const accessibleSurfaceCount =
    universalLinks.length + roleGuides.reduce((count, guide) => count + guide.links.length, 0);
  const workspaceSignals = [
    {
      label: 'Default route',
      value: '/app',
    },
    {
      label: 'Accessible surfaces',
      value: `${accessibleSurfaceCount} routes`,
    },
    {
      label: 'Desktop priority',
      value: roleHubPanel.desktopPriority,
    },
  ];
  const sessionMetrics = [
    {
      label: 'Current roles',
      value: roleNames.length > 0 ? roleNames.join(', ') : 'No explicit role assigned yet.',
    },
    {
      label: 'Primary lane',
      value: roleHubPanel.primaryLane,
    },
    {
      label: 'Role split',
      value: roleHubPanel.roleSplit,
    },
  ];
  const operatingRules = [
    {
      title: 'Citizen reports stay central',
      description: 'The role hub keeps reporting and follow-up visible instead of treating the product as only a manager dashboard.',
    },
    {
      title: 'Mobile-first roles stay honest',
      description: 'Citizen and agent web routes stay available, but they are framed as companion flows rather than the main field experience.',
    },
    {
      title: 'Manager and admin web remain primary',
      description: 'Desktop monitoring, planning, reporting, and governance stay centered on the roles that actually use them most.',
    },
  ];

  return (
    <section className="app-home-page app-content-page">
      <div className="app-home-stack">
        <section className="app-home-command">
          <div className="app-home-command-grid">
            <div className="app-home-command-copy">
              <div className="app-home-badge">
                <House size={14} aria-hidden="true" />
                {roleHubPanel.badgeLabel}
              </div>
              <div className="app-home-command-heading">
                <h1>{roleHubPanel.heading}</h1>
                <p>
                  {firstName}, {roleHubPanel.description}
                </p>
              </div>
              <div className="app-home-signal-row">
                {workspaceSignals.map((signal) => (
                  <div key={signal.label} className="app-home-signal">
                    <p className="app-home-signal-label">{signal.label}</p>
                    <p className="app-home-signal-value">{signal.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <aside className="app-home-command-panel">
              <div className="app-home-card-head">
                <span className="app-home-icon app-home-icon-muted">
                  <Compass size={18} aria-hidden="true" />
                </span>
                <div>
                  <h2>{roleHubPanel.panelTitle}</h2>
                  <p>{roleHubPanel.panelDescription}</p>
                </div>
              </div>

              <dl className="app-home-metric-list">
                {sessionMetrics.map((metric) => (
                  <div key={metric.label} className="app-home-metric">
                    <dt>{metric.label}</dt>
                    <dd>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </section>

        <div className="app-home-workspace-grid">
          <section className="app-home-card app-home-card-main">
            <div className="app-home-card-head">
              <span className="app-home-icon">
                <Sparkles size={18} aria-hidden="true" />
              </span>
              <div>
                <h2>Priority actions</h2>
                <p>
                  Start with the highest-value lane for this account without collapsing the product into a generic dashboard-first story.
                </p>
              </div>
            </div>

            <div className="app-home-action-grid">
              {priorityActions.map((link) => (
                <Link key={link.to} to={link.to} className="app-home-action-card">
                  <div className="app-home-action-title">
                    <span className="app-home-icon app-home-icon-compact">
                      {renderRouteIcon(link.to)}
                    </span>
                    <span>{link.label}</span>
                  </div>
                  <span className="app-home-link-meta">{link.meta}</span>
                  <p>{link.description}</p>
                  <span className="app-home-action-arrow">
                    Launch
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <aside className="app-home-card app-home-card-side">
            <div className="app-home-card-head">
              <span className="app-home-icon app-home-icon-muted">
                <Shield size={18} aria-hidden="true" />
              </span>
              <div>
                <h2>Operating model</h2>
                <p>
                  The role hub keeps product positioning clear even when one account can access multiple surfaces.
                </p>
              </div>
            </div>

            <div className="app-home-rule-list">
              {operatingRules.map((rule, index) => (
                <div key={rule.title} className="app-home-rule-item">
                  <span className="app-home-rule-index">0{index + 1}</span>
                  <div>
                    <h3>{rule.title}</h3>
                    <p>{rule.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="app-home-lanes">
          <div className="app-home-section-title">
            <p className="app-home-section-eyebrow">Workspace lanes</p>
            <h2>Role-aware entry points</h2>
            <p>
              Every authenticated user shares one entry point, then branches into the correct lane with the citizen-first product loop still visible.
            </p>
          </div>

          {roleGuides.length > 0 ? (
            <div className="app-home-lane-grid">
              {roleGuides.map((guide) => (
                <section key={guide.title} className="app-home-card app-home-lane-card">
                  <div className="app-home-lane-top">
                    <span className="app-home-icon">
                      {renderRouteIcon(guide.links[0]?.to ?? '/app', 18)}
                    </span>
                    <div>
                      <p className="app-home-lane-eyebrow">{guide.eyebrow}</p>
                      <h3>{guide.title}</h3>
                    </div>
                  </div>

                  <p>{guide.description}</p>

                  <div className="app-home-lane-links">
                    {guide.links.map((link) => (
                      <Link key={link.to} to={link.to} className="app-home-action-card app-home-lane-link">
                        <div className="app-home-action-title">
                          <span>{link.label}</span>
                        </div>
                        <span className="app-home-link-meta">{link.meta}</span>
                        <p>{link.description}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <section className="app-home-card app-home-card-full">
              <h2>Shared workspace only</h2>
              <p className="app-home-empty-copy">
                This account currently uses the common support and settings surfaces only. If
                additional roles are assigned later, their lanes will appear here automatically.
              </p>
            </section>
          )}
        </section>
      </div>
    </section>
  );
}
