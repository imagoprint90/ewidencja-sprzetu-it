import { z } from "zod";

export const equipmentFormSchema = z
  .object({
    inventoryNumber: z.string().trim().min(1, "Numer inwentarzowy jest wymagany."),
    categoryId: z.string().min(1, "Wybierz kategorię."),
    name: z.string().trim().min(1, "Nazwa sprzętu jest wymagana."),
    manufacturer: z.string().trim().optional(),
    model: z.string().trim().optional(),
    serialNumber: z.string().trim().optional(),
    purchaseDate: z.string().optional(),
    warrantyEnd: z.string().optional(),
    technicalCondition: z
      .union([z.literal(""), z.enum(["bardzo_dobry", "dobry", "dostateczny", "uszkodzony"])])
      .optional(),
    purchasePrice: z
      .string()
      .optional()
      .refine((v) => !v || !Number.isNaN(Number(v)), "Cena musi być liczbą."),
    location: z.string().trim().min(1, "Lokalizacja jest wymagana."),
    notes: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      !data.purchaseDate || !data.warrantyEnd || data.warrantyEnd >= data.purchaseDate,
    {
      message: "Koniec gwarancji nie może być wcześniejszy niż data zakupu.",
      path: ["warrantyEnd"],
    }
  );

export type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;

export const employeeFormSchema = z.object({
  fullName: z.string().trim().min(1, "Imię i nazwisko są wymagane."),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Nieprawidłowy adres e-mail."),
  department: z.string().trim().min(1, "Dział jest wymagany."),
  location: z.string().trim().min(1, "Lokalizacja jest wymagana."),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
