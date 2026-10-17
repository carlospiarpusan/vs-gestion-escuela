begin;

create or replace function public._normalize_legacy_combo_categories(input_categories text[])
returns text[]
language sql
immutable
as $$
  with expanded as (
    select unnest(
      case normalized
        when 'A2 Y B1' then array['A2', 'B1']
        when 'A2 Y C1' then array['A2', 'C1']
        when 'A2 Y RC1' then array['A2', 'RC1']
        when 'A2 Y C2' then array['A2', 'C2']
        when 'A2 Y C3' then array['A2', 'C3']
        when 'A1 Y B1' then array['A1', 'B1']
        when 'A1 Y C1' then array['A1', 'C1']
        when 'A1 Y RC1' then array['A1', 'RC1']
        when 'A1 Y C2' then array['A1', 'C2']
        when 'A1 Y C3' then array['A1', 'C3']
        else array[normalized]
      end
    ) as category
    from (
      select upper(trim(regexp_replace(raw_value, '\s+', ' ', 'g'))) as normalized
      from unnest(coalesce(input_categories, '{}'::text[])) raw_value
    ) normalized_values
    where normalized <> ''
  ),
  deduped as (
    select distinct category
    from expanded
    where category <> ''
  )
  select coalesce(
    array_agg(
      category
      order by
        coalesce(
          array_position(
            array['AM', 'A', 'A1', 'A2', 'B', 'B1', 'C', 'C1', 'RC', 'RC1', 'C2', 'C3', 'D']::text[],
            category
          ),
          999
        ),
        category
    ),
    '{}'::text[]
  )
  from deduped;
$$;

update public.escuelas
set categorias = public._normalize_legacy_combo_categories(categorias)
where categorias && array[
  'A2 y B1', 'A2 y C1', 'A2 y RC1', 'A2 y C2', 'A2 y C3',
  'A1 y B1', 'A1 y C1', 'A1 y RC1', 'A1 y C2', 'A1 y C3'
]::text[];

update public.alumnos
set categorias = public._normalize_legacy_combo_categories(categorias)
where categorias && array[
  'A2 y B1', 'A2 y C1', 'A2 y RC1', 'A2 y C2', 'A2 y C3',
  'A1 y B1', 'A1 y C1', 'A1 y RC1', 'A1 y C2', 'A1 y C3'
]::text[];

update public.matriculas_alumno
set categorias = public._normalize_legacy_combo_categories(categorias)
where categorias && array[
  'A2 y B1', 'A2 y C1', 'A2 y RC1', 'A2 y C2', 'A2 y C3',
  'A1 y B1', 'A1 y C1', 'A1 y RC1', 'A1 y C2', 'A1 y C3'
]::text[];

drop function public._normalize_legacy_combo_categories(text[]);

commit;
