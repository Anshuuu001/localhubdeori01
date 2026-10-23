import crypto from 'crypto';
import { executeQuery } from '../config/database.js';
import { logAuditEvent } from '../services/audit.service.js';

const VALID_CATEGORIES = [
  'police',
  'medical',
  'fire',
  'disaster',
  'electrical',
  'wildlife_rescue',
  'women_child',
  'administrative',
  'other',
];

/**
 * GET /api/emergency/status
 * Phase 1 backward-compatible endpoint updated with live verified database metrics.
 */
export async function getEmergencyStatus(req, res) {
  try {
    const [rows] = await executeQuery(
      `SELECT 
        COUNT(*) AS total_active,
        SUM(CASE WHEN is_verified = TRUE THEN 1 ELSE 0 END) AS verified_count,
        MAX(last_verified_at) AS latest_verified_at
       FROM emergency_contacts 
       WHERE status = 'active'`
    );

    const activeCount = Number(rows[0]?.total_active || 0);
    const verifiedCount = Number(rows[0]?.verified_count || 0);
    const latestVerified = rows[0]?.latest_verified_at;

    const isConfigured = verifiedCount > 0;

    return res.json({
      success: true,
      status: isConfigured ? 'verified_directory_active' : 'unverified_configuration_required',
      verifiedDataConfigured: isConfigured,
      activeContactsCount: activeCount,
      verifiedContactsCount: verifiedCount,
      lastVerifiedAt: latestVerified,
      message: isConfigured
        ? 'Official verified emergency contacts are active. All listed local contacts require authoritative departmental verification.'
        : 'Official Deori Taluka emergency directory is not yet configured with verified administrative records. To prevent endangerment, no placeholder or unverified contact numbers are displayed.',
      nationalEmergencyLines: [
        {
          service: 'All India Emergency Response Support System (ERSS)',
          number: '112',
          description: 'Unified 24x7 toll-free emergency helpline for Police, Fire, and Medical Assistance.',
          isNationalStandard: true,
        },
        {
          service: 'Maharashtra National Health Mission Ambulance (MEMS)',
          number: '108',
          description: 'Toll-free emergency medical response service across Maharashtra.',
          isNationalStandard: true,
        },
      ],
      disclaimer: 'Always dial 112 in life-threatening situations. Listed local numbers require periodic verification and may experience rural telecom interruptions.',
    });
  } catch (err) {
    console.error('[GET_EMERGENCY_STATUS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve emergency status.' },
    });
  }
}

/**
 * GET /api/emergency/contacts
 * Public listing of verified active emergency contacts.
 */
export async function listEmergencyContacts(req, res) {
  try {
    const {
      category,
      areaId,
      search = '',
    } = req.query;

    const conditions = ["e.status = 'active'"];
    const params = [];

    if (category && category !== 'All' && VALID_CATEGORIES.includes(category)) {
      conditions.push('e.category = ?');
      params.push(category);
    }

    if (areaId && areaId !== 'all') {
      conditions.push('(e.area_id = ? OR e.area_id IS NULL)');
      params.push(areaId);
    }

    if (search && search.trim()) {
      conditions.push('(LOWER(e.name) LIKE ? OR LOWER(e.department) LIKE ? OR e.primary_phone LIKE ?)');
      const pattern = `%${search.trim().toLowerCase()}%`;
      params.push(pattern, pattern, `%${search.trim()}%`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const [rows] = await executeQuery(
      `SELECT 
        e.id,
        e.name,
        e.department,
        e.category,
        e.primary_phone,
        e.secondary_phone,
        e.area_id,
        e.address,
        e.opening_hours,
        e.authoritative_source,
        e.is_verified,
        e.last_verified_at,
        e.is_national_standard,
        e.sort_order,
        e.status,
        a.name AS area_name,
        a.marathi_name AS area_marathi_name
       FROM emergency_contacts e
       LEFT JOIN taluka_areas a ON e.area_id = a.id
       ${whereClause}
       ORDER BY e.is_national_standard DESC, e.sort_order ASC, e.name ASC`,
      params
    );

    return res.json({
      contacts: rows.map(r => ({
        id: r.id,
        name: r.name,
        department: r.department,
        category: r.category,
        primaryPhone: r.primary_phone,
        secondaryPhone: r.secondary_phone,
        areaId: r.area_id,
        areaName: r.area_name || 'Taluka-wide Coverage',
        areaMarathiName: r.area_marathi_name || 'संपूर्ण तालुका',
        address: r.address,
        openingHours: r.opening_hours,
        authoritativeSource: r.authoritative_source,
        isVerified: Boolean(r.is_verified),
        lastVerifiedAt: r.last_verified_at,
        isNationalStandard: Boolean(r.is_national_standard),
      })),
      total: rows.length,
      disclaimer: 'Contacts undergo official departmental verification. In urgent life-safety situations, dial 112 directly.',
    });
  } catch (err) {
    console.error('[LIST_EMERGENCY_CONTACTS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve emergency contacts.' },
    });
  }
}

/**
 * GET /api/emergency/contacts/:id
 */
export async function getEmergencyContactById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await executeQuery(
      `SELECT 
        e.*,
        a.name AS area_name,
        a.marathi_name AS area_marathi_name
       FROM emergency_contacts e
       LEFT JOIN taluka_areas a ON e.area_id = a.id
       WHERE e.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'CONTACT_NOT_FOUND', message: 'Emergency contact not found.' },
      });
    }

    const c = rows[0];

    return res.json({
      contact: {
        id: c.id,
        name: c.name,
        department: c.department,
        category: c.category,
        primaryPhone: c.primary_phone,
        secondaryPhone: c.secondary_phone,
        areaId: c.area_id,
        areaName: c.area_name || 'Taluka-wide Coverage',
        areaMarathiName: c.area_marathi_name,
        address: c.address,
        openingHours: c.opening_hours,
        authoritativeSource: c.authoritative_source,
        isVerified: Boolean(c.is_verified),
        lastVerifiedAt: c.last_verified_at,
        isNationalStandard: Boolean(c.is_national_standard),
        status: c.status,
      },
    });
  } catch (err) {
    console.error('[GET_EMERGENCY_CONTACT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve emergency contact.' },
    });
  }
}

/**
 * POST /api/emergency/contacts
 * Add a new official emergency contact. Requires editor/admin role.
 */
export async function createEmergencyContact(req, res) {
  try {
    const reviewerId = req.user.id;
    const {
      name,
      department,
      category,
      primaryPhone,
      secondaryPhone,
      areaId,
      address,
      openingHours = '24x7',
      authoritativeSource,
      isVerified = true,
      sortOrder = 0,
    } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        error: { code: 'NAME_REQUIRED', message: 'Contact name or duty desk title is required.' },
      });
    }

    if (!department || department.trim().length < 2) {
      return res.status(400).json({
        error: { code: 'DEPARTMENT_REQUIRED', message: 'Department or agency name is required.' },
      });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: { code: 'INVALID_CATEGORY', message: 'Please select a valid emergency category.' },
      });
    }

    const cleanPhone = String(primaryPhone || '').trim();
    if (!cleanPhone || !/^[0-9\-\+\s]{3,20}$/.test(cleanPhone)) {
      return res.status(400).json({
        error: { code: 'INVALID_PHONE', message: 'Please provide a valid emergency phone number or landline.' },
      });
    }

    if (!authoritativeSource || authoritativeSource.trim().length < 5) {
      return res.status(400).json({
        error: {
          code: 'AUTHORITATIVE_SOURCE_REQUIRED',
          message: 'Official source proof (e.g. departmental circular, police directory, hospital superintendent sign-off) is required.',
        },
      });
    }

    const contactId = crypto.randomUUID();
    const finalStatus = isVerified ? 'active' : 'under_review';

    await executeQuery(
      `INSERT INTO emergency_contacts (
        id, name, department, category, primary_phone, secondary_phone,
        area_id, address, opening_hours, authoritative_source,
        is_verified, last_verified_at, verified_by_user_id, status, is_national_standard, sort_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, FALSE, ?, NOW(), NOW())`,
      [
        contactId,
        name.trim(),
        department.trim(),
        category,
        cleanPhone,
        secondaryPhone ? secondaryPhone.trim() : null,
        areaId || null,
        address ? address.trim() : null,
        openingHours || '24x7',
        authoritativeSource.trim(),
        Boolean(isVerified),
        reviewerId,
        finalStatus,
        parseInt(sortOrder, 10) || 0,
      ]
    );

    await logAuditEvent({
      actorId: reviewerId,
      action: 'emergency_contact.created',
      entityType: 'emergency_contact',
      entityId: contactId,
      details: { name, department, primaryPhone, authoritativeSource },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency contact created and recorded with authoritative verification source.',
      contact: {
        id: contactId,
        name: name.trim(),
        department: department.trim(),
        status: finalStatus,
        isVerified: Boolean(isVerified),
      },
    });
  } catch (err) {
    console.error('[CREATE_EMERGENCY_CONTACT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create emergency contact.' },
    });
  }
}

/**
 * PATCH /api/emergency/contacts/:id
 * Update an existing emergency contact. Requires editor/admin role.
 */
export async function updateEmergencyContact(req, res) {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const {
      name,
      department,
      category,
      primaryPhone,
      secondaryPhone,
      areaId,
      address,
      openingHours,
      authoritativeSource,
      status,
      isVerified,
    } = req.body;

    const [rows] = await executeQuery('SELECT * FROM emergency_contacts WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'CONTACT_NOT_FOUND', message: 'Emergency contact not found.' },
      });
    }

    const existing = rows[0];

    const updatedName = name ? name.trim() : existing.name;
    const updatedDept = department ? department.trim() : existing.department;
    const updatedCat = category && VALID_CATEGORIES.includes(category) ? category : existing.category;
    const updatedPhone = primaryPhone ? primaryPhone.trim() : existing.primary_phone;
    const updatedSecPhone = secondaryPhone !== undefined ? (secondaryPhone ? secondaryPhone.trim() : null) : existing.secondary_phone;
    const updatedArea = areaId !== undefined ? (areaId || null) : existing.area_id;
    const updatedAddr = address !== undefined ? (address ? address.trim() : null) : existing.address;
    const updatedHours = openingHours ? openingHours.trim() : existing.opening_hours;
    const updatedSource = authoritativeSource ? authoritativeSource.trim() : existing.authoritative_source;
    const updatedStatus = status && ['active', 'under_review', 'inactive'].includes(status) ? status : existing.status;
    const updatedVerified = isVerified !== undefined ? Boolean(isVerified) : existing.is_verified;

    await executeQuery(
      `UPDATE emergency_contacts 
       SET name = ?, department = ?, category = ?, primary_phone = ?, secondary_phone = ?,
           area_id = ?, address = ?, opening_hours = ?, authoritative_source = ?,
           status = ?, is_verified = ?, last_verified_at = NOW(), verified_by_user_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        updatedName,
        updatedDept,
        updatedCat,
        updatedPhone,
        updatedSecPhone,
        updatedArea,
        updatedAddr,
        updatedHours,
        updatedSource,
        updatedStatus,
        updatedVerified,
        reviewerId,
        id,
      ]
    );

    await logAuditEvent({
      actorId: reviewerId,
      action: 'emergency_contact.updated',
      entityType: 'emergency_contact',
      entityId: id,
      details: { name: updatedName, primaryPhone: updatedPhone, status: updatedStatus },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      success: true,
      message: 'Emergency contact updated successfully.',
      contact: {
        id,
        name: updatedName,
        department: updatedDept,
        status: updatedStatus,
        lastVerifiedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[UPDATE_EMERGENCY_CONTACT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update emergency contact.' },
    });
  }
}

/**
 * POST /api/emergency/contacts/:id/report
 * Citizen report for incorrect, unreachable, or outdated contact.
 */
export async function submitEmergencyContactReport(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user.id : null;
    const { reason, suggestedNumber, evidenceNotes, reporterName } = req.body;

    const [rows] = await executeQuery('SELECT id, name FROM emergency_contacts WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'CONTACT_NOT_FOUND', message: 'Emergency contact not found.' },
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        error: { code: 'REASON_REQUIRED', message: 'Please specify the issue (e.g. unreachable, wrong number, discontinued).' },
      });
    }

    if (!evidenceNotes || evidenceNotes.trim().length < 5) {
      return res.status(400).json({
        error: { code: 'EVIDENCE_REQUIRED', message: 'Please provide at least 5 characters detailing the inaccuracy or test result.' },
      });
    }

    const reportId = crypto.randomUUID();

    await executeQuery(
      `INSERT INTO emergency_contact_reports (
        id, contact_id, reporter_user_id, reporter_name, reason, suggested_number, evidence_notes, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        reportId,
        id,
        userId,
        reporterName || (req.user ? req.user.fullName : 'Anonymous Citizen'),
        reason.trim(),
        suggestedNumber ? suggestedNumber.trim() : null,
        evidenceNotes.trim(),
      ]
    );

    await logAuditEvent({
      actorId: userId || 'anonymous',
      action: 'emergency_contact.reported',
      entityType: 'emergency_contact',
      entityId: id,
      details: { reportId, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.status(201).json({
      success: true,
      message: 'Urgent contact correction report submitted. Our team will verify against official records. In life-safety situations, dial 112 directly.',
      reportId,
      status: 'pending',
    });
  } catch (err) {
    console.error('[SUBMIT_CONTACT_REPORT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to submit contact report.' },
    });
  }
}

/**
 * GET /api/emergency/reports/queue
 * List urgent contact correction reports. Requires editor/admin role.
 */
export async function listEmergencyContactReports(req, res) {
  try {
    const [rows] = await executeQuery(
      `SELECT 
        r.*,
        c.name AS contact_name,
        c.department AS contact_department,
        c.primary_phone AS contact_current_phone
       FROM emergency_contact_reports r
       JOIN emergency_contacts c ON r.contact_id = c.id
       WHERE r.status IN ('pending', 'under_investigation')
       ORDER BY r.created_at ASC`
    );

    return res.json({
      reports: rows,
      count: rows.length,
    });
  } catch (err) {
    console.error('[LIST_CONTACT_REPORTS_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve reports queue.' },
    });
  }
}

/**
 * POST /api/emergency/reports/:id/review
 * Review contact report: verified_updated or dismissed. Requires editor/admin role.
 */
export async function reviewEmergencyContactReport(req, res) {
  try {
    const { id } = req.params;
    const reviewerId = req.user.id;
    const { decision, notes } = req.body; // 'verified_updated' | 'dismissed'

    if (!decision || !['verified_updated', 'dismissed'].includes(decision)) {
      return res.status(400).json({
        error: { code: 'INVALID_DECISION', message: 'Decision must be "verified_updated" or "dismissed".' },
      });
    }

    const [rows] = await executeQuery('SELECT * FROM emergency_contact_reports WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Report not found.' },
      });
    }

    await executeQuery(
      `UPDATE emergency_contact_reports 
       SET status = ?, admin_notes = ?, reviewed_by_user_id = ?, reviewed_at = NOW() 
       WHERE id = ?`,
      [decision, notes || null, reviewerId, id]
    );

    await logAuditEvent({
      actorId: reviewerId,
      action: `emergency_report.${decision}`,
      entityType: 'emergency_contact_report',
      entityId: id,
      details: { decision, notes },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return res.json({
      success: true,
      message: `Emergency report marked as ${decision}.`,
      status: decision,
    });
  } catch (err) {
    console.error('[REVIEW_EMERGENCY_REPORT_ERROR]', err);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to record report review.' },
    });
  }
}
