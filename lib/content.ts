export type SignSettings = {
  id: string; revision: number; enabled?: boolean; evaluationEnabled?: boolean;
  glosa?: string; significado?: string; configuracionMano?: string; ubicacion?: string; orientacion?: string;
  hasReference: boolean; updatedAt?: string;
};
export type SignEdit = Required<Pick<SignSettings, 'revision' | 'enabled' | 'evaluationEnabled' | 'glosa' | 'significado' | 'configuracionMano' | 'ubicacion' | 'orientacion'>>;
export type AdminUsers = { users: { id: string; name: string; email: string; createdAt: string }[]; total: number; page: number; pageSize: number };
