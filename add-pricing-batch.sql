begin;

alter table public.services
  alter column partner_price drop not null,
  alter column regular_price drop not null,
  add column if not exists price_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'services_pricing_mode_check'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_pricing_mode_check check (
        (partner_price is not null and regular_price is not null and price_note is null)
        or
        (partner_price is null and regular_price is null and price_note = 'حسب الاتفاق')
      );
  end if;
end
$$;

with requested_categories (name, sort_order) as (
  values
    ('خدمات الإقامة والكفيل', 1),
    ('خدمات الشاحنات', 2),
    ('خدمات الخروج النهائي', 3),
    ('خدمات المتوفى', 4)
)
insert into public.categories (name, sort_order)
select requested.name, requested.sort_order
from requested_categories as requested
where not exists (
  select 1
  from public.categories as existing
  where existing.name = requested.name
);

with requested_services (
  category_name,
  name,
  partner_price,
  regular_price,
  price_note
) as (
  values
    ('خدمات الإقامة والكفيل', 'إصدار إقامة كفيل طفل', 138::numeric, 250::numeric, null::text),
    ('خدمات الإقامة والكفيل', 'تجديد إقامة كفيل طفل', 138::numeric, 250::numeric, null::text),
    ('خدمات الإقامة والكفيل', 'خروج وعودة كفيل طفل', 154::numeric, 280::numeric, null::text),
    ('خدمات الإقامة والكفيل', 'إصدار إقامة كفيل كبير', 165::numeric, 300::numeric, null::text),
    ('خدمات الإقامة والكفيل', 'تجديد إقامة كفيل كبير', 165::numeric, 300::numeric, null::text),
    ('خدمات الإقامة والكفيل', 'خروج وعودة كفيل كبير', 165::numeric, 300::numeric, null::text),
    ('خدمات الإقامة والكفيل', 'تمديد خروج وعودة طفل وكبير', 220::numeric, 400::numeric, null::text),
    ('خدمات الإقامة والكفيل', 'خروج نهائي اقل من شهر بوكالة', 440::numeric, 800::numeric, null::text),
    ('خدمات الشاحنات', 'تجديد شاحنة بالصور', 385::numeric, 700::numeric, null::text),
    ('خدمات الشاحنات', 'تجديد إقامة كبير وطفل شاحنة', 165::numeric, 300::numeric, null::text),
    ('خدمات الخروج النهائي', 'إلغاء خروج نهائي منتهي بالصور', null::numeric, null::numeric, 'حسب الاتفاق'),
    ('خدمات المتوفى', 'تجديد متوفى سنة', 825::numeric, 1500::numeric, null::text),
    ('خدمات المتوفى', 'تجديد متوفى سنتين', 935::numeric, 1700::numeric, null::text),
    ('خدمات المتوفى', 'خروج وعودة متوفى', 770::numeric, 1400::numeric, null::text)
)
insert into public.services (
  category_id,
  name,
  partner_price,
  regular_price,
  price_note
)
select
  category.id,
  requested.name,
  requested.partner_price,
  requested.regular_price,
  requested.price_note
from requested_services as requested
join public.categories as category
  on category.name = requested.category_name
where not exists (
  select 1
  from public.services as existing
  where existing.category_id = category.id
    and existing.name = requested.name
);

commit;
