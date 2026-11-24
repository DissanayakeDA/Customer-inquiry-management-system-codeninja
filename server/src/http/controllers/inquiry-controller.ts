import {
  assignInquirySchema,
  changeStatusSchema,
  createInquirySchema,
  listInquiriesQuerySchema,
  type InquiryDto,
  type InquiryListResponse,
} from '@inquirydesk/shared';
import type { Request, Response } from 'express';
import { toInquiryDto } from '../../domain/inquiry';
import type { InquiryService } from '../../services/inquiry-service';
import { requireUser } from '../request-context';
import { parseInquiryId, parseWith } from '../validation';

/** Translates HTTP ⇄ use cases. No business rules here: parse, delegate, serialise. */
export class InquiryController {
  constructor(private readonly inquiries: InquiryService) {}

  /** GET /api/inquiries?status=&q=&assignee=me|none&page=&pageSize= */
  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseWith(listInquiriesQuerySchema, req.query);
    const result = await this.inquiries.list(requireUser(req), query);
    res.json({ ...result, items: result.items.map(toInquiryDto) } satisfies InquiryListResponse);
  };

  /** GET /api/inquiries/:id */
  get = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const inquiry = await this.inquiries.getById(requireUser(req), parseInquiryId(req.params.id));
    res.json(toInquiryDto(inquiry) satisfies InquiryDto);
  };

  /** POST /api/inquiries */
  create = async (req: Request, res: Response): Promise<void> => {
    const input = parseWith(createInquirySchema, req.body);
    const inquiry = await this.inquiries.create(requireUser(req), input);
    res.status(201).location(`/api/inquiries/${inquiry.id}`).json(toInquiryDto(inquiry) satisfies InquiryDto);
  };

  /** PATCH /api/inquiries/:id/status  { status, version } */
  changeStatus = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const id = parseInquiryId(req.params.id);
    const input = parseWith(changeStatusSchema, req.body);
    const inquiry = await this.inquiries.changeStatus(requireUser(req), id, input);
    res.json(toInquiryDto(inquiry) satisfies InquiryDto);
  };

  /** PATCH /api/inquiries/:id/assignee  { assigneeId, version } */
  assign = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const id = parseInquiryId(req.params.id);
    const input = parseWith(assignInquirySchema, req.body);
    const inquiry = await this.inquiries.assign(requireUser(req), id, input);
    res.json(toInquiryDto(inquiry) satisfies InquiryDto);
  };
}
