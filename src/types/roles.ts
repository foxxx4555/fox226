export type AdminRole =
    | 'Super Admin'
    | 'Operations'
    | 'Carrier Manager'
    | 'Vendor Manager'
    | 'Buyer Support'
    | 'Finance'
    | 'Analytics'
    | 'Admin';

export const RolePermissions = {
    // إدارة الشحنات
    manage_loads: ['Super Admin', 'Operations', 'Buyer Support', 'Admin'] as AdminRole[],

    // إدارة الناقلين
    manage_carriers: ['Super Admin', 'Carrier Manager', 'Admin'] as AdminRole[],

    // إدارة البائعين/الشاحنين
    manage_vendors: ['Super Admin', 'Vendor Manager', 'Admin'] as AdminRole[],

    // إدارة المشترين/المستلمين
    manage_buyers: ['Super Admin', 'Buyer Support', 'Vendor Manager', 'Admin'] as AdminRole[],

    // المدفوعات والفوترة
    manage_finance: ['Super Admin', 'Finance', 'Admin'] as AdminRole[],

    // التقارير والتحليلات
    view_reports: [
        'Super Admin',
        'Operations',
        'Carrier Manager',
        'Vendor Manager',
        'Buyer Support',
        'Finance',
        'Analytics',
        'Admin'
    ] as AdminRole[],

    // الأمان والتدقيق (إدارة النظام)
    manage_security: ['Super Admin'] as AdminRole[],

    // إدارة الدعم الفني (إذا كان مطلوباً، يتم دمجه من الصلاحيات الأخرى، أو يعطى لمن له علاقة كـ Operations و Buyer Support)
    manage_support: ['Super Admin', 'Operations', 'Buyer Support', 'Admin'] as AdminRole[],
};

export const hasPermission = (userRole: AdminRole, requiredRoles: AdminRole[]) => {
    return requiredRoles.includes(userRole);
};
