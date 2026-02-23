export type AdminRole =
    | 'Super Admin'
    | 'Operations Manager'
    | 'Carrier Manager'
    | 'Vendor Manager'
    | 'Buyer Manager'
    | 'Support'
    | 'Finance'
    | 'Analytics';

export const RolePermissions = {
    // إدارة الشحنات
    manage_loads: ['Super Admin', 'Operations Manager', 'Vendor Manager'] as AdminRole[],

    // إدارة الناقلين
    manage_carriers: ['Super Admin', 'Carrier Manager'] as AdminRole[],

    // إدارة البائعين/الشاحنين
    manage_vendors: ['Super Admin', 'Vendor Manager'] as AdminRole[],

    // إدارة المشترين/المستلمين
    manage_buyers: ['Super Admin', 'Buyer Manager'] as AdminRole[],

    // المدفوعات والفوترة
    manage_finance: ['Super Admin', 'Finance'] as AdminRole[],

    // التقارير والتحليلات
    view_reports: [
        'Super Admin',
        'Operations Manager',
        'Carrier Manager',
        'Vendor Manager',
        'Buyer Manager',
        'Support',
        'Finance',
        'Analytics'
    ] as AdminRole[],

    // الأمان والتدقيق (إدارة النظام)
    manage_security: ['Super Admin'] as AdminRole[],

    // إدارة الدعم الفني
    manage_support: ['Super Admin', 'Support', 'Operations Manager'] as AdminRole[],
};

export const hasPermission = (userRole: AdminRole, requiredRoles: AdminRole[]) => {
    return requiredRoles.includes(userRole);
};
