import { z } from "zod";

const equipmentBaseSchema = z.object({
  categoryId: z.string().min(1, "Wybierz kategorię."),
  name: z.string().trim().min(1, "Nazwa sprzętu jest wymagana."),
  manufacturer: z.string().trim().optional(),
  model: z.string().trim().optional(),
  serialNumber: z.string().trim().optional(),
  purchaseDate: z.string().optional(),
  warrantyEnd: z.string().optional(),
  technicalCondition: z
    .union([z.literal(""), z.enum(["nowy", "bardzo_dobry", "dobry", "dostateczny", "uszkodzony"])])
    .optional(),
  purchasePrice: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), "Cena musi być liczbą."),
  notes: z.string().trim().optional(),
});

const warrantyRefine = {
  check: (data: { purchaseDate?: string; warrantyEnd?: string }) =>
    !data.purchaseDate || !data.warrantyEnd || data.warrantyEnd >= data.purchaseDate,
  message: {
    message: "Koniec gwarancji nie może być wcześniejszy niż data zakupu.",
    path: ["warrantyEnd"] as string[],
  },
};

// Formularz dodawania: numer inwentarzowy nadaje się automatycznie, więc nie ma go tutaj.
export const equipmentAddFormSchema = equipmentBaseSchema.refine(
  warrantyRefine.check,
  warrantyRefine.message
);
export type EquipmentAddFormValues = z.infer<typeof equipmentAddFormSchema>;

// Formularz edycji: numer inwentarzowy można poprawić ręcznie (np. dopasować do naklejki).
export const equipmentFormSchema = equipmentBaseSchema
  .extend({
    inventoryNumber: z.string().trim().min(1, "Numer inwentarzowy jest wymagany."),
  })
  .refine(warrantyRefine.check, warrantyRefine.message);
export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;

export const employeeFormSchema = z.object({
  firstName: z.string().trim().min(1, "Imię jest wymagane."),
  lastName: z.string().trim().min(1, "Nazwisko jest wymagane."),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Nieprawidłowy adres e-mail."),
  phone: z.string().trim().optional(),
  department: z.string().trim().optional(),
  locationId: z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export const userFormSchema = z.object({
  fullName: z.string().trim().min(1, "Imię i nazwisko są wymagane."),
  email: z.string().trim().email("Nieprawidłowy adres e-mail."),
  password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków."),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
