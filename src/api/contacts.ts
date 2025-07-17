import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param } from 'express-validator';
import contactService from '../services/contactService';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Create a new contact
router.post('/',
  body('name').isString().notEmpty().withMessage('Name is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phone').optional().isString(),
  body('organization').optional().isString(),
  body('notes').optional().isString(),
  body('tags').optional().isArray(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const contactData = { ...req.body, userId };

      const contact = await contactService.createContact(contactData);
      
      res.status(201).json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all contacts
router.get('/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      const contacts = await contactService.getAllContacts(userId);
      
      res.json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Search contacts
router.get('/search',
  query('q').isString().notEmpty().withMessage('Search query is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { q } = req.query;

      const contacts = await contactService.searchContacts(userId, q as string);
      
      res.json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get a specific contact
router.get('/:contactId',
  param('contactId').isUUID().withMessage('Valid contact ID is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId } = req.params;

      const contact = await contactService.getContact(contactId);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          error: 'Contact not found',
        });
      }

      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update a contact
router.put('/:contactId',
  param('contactId').isUUID().withMessage('Valid contact ID is required'),
  body('name').optional().isString(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('organization').optional().isString(),
  body('notes').optional().isString(),
  body('tags').optional().isArray(),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId } = req.params;
      const updates = req.body;

      const contact = await contactService.updateContact(contactId, updates);
      
      res.json({
        success: true,
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete a contact
router.delete('/:contactId',
  param('contactId').isUUID().withMessage('Valid contact ID is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId } = req.params;

      await contactService.deleteContact(contactId);
      
      res.json({
        success: true,
        message: 'Contact deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Import contacts
router.post('/import',
  body('source').isString().isIn(['google', 'outlook', 'csv']).withMessage('Valid import source is required'),
  body('data').notEmpty().withMessage('Import data is required'),
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { source, data } = req.body;

      const importedCount = await contactService.importContacts(userId, source, data);
      
      res.json({
        success: true,
        message: `Successfully imported ${importedCount} contacts`,
        data: {
          importedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;