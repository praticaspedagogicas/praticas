# Fluxo de Validação e Reutilização de Guiões Pedagógicos

## 1. Fluxo atual (Validação e Publicação)

```
Guião submetido pelo docente
        ↓
Coordenador valida
        ↓
Docente autorizou publicação no repositório
        ↓
Guião entra no Repositório de Práticas Pedagógicas
```

✅ Este fluxo está CORRETO e não deve mudar.

---

## 2. Reutilização por outros docentes (Fluxo Futuro)

```
Docente abre o template
        ↓
Clica em "Consultar Repositório"
        ↓
Escolhe: Curso, UC, Turma/Edição, Ano Letivo
        ↓
Sistema mostra guiões disponíveis
        ↓
Docente escolhe "Usar este guião"
        ↓
ANTES de permitir réutilizar, o sistema verifica:
  - Este guião já foi usado nesta turma neste ano?
```

---

## 3. Regra Anti-Repetição

**Verificação:**

| Campo | Verificado |
|-------|----------|
| ID do Guião | ✅ |
| Curso | ✅ |
| UC | ✅ |
| Ano Letivo | ✅ |
| Turma/Edição | ✅ |

**Lógica:**
- Se já existir 1 ou 2 reutilizações: bloquear ou avisar
- Se ainda não existir: permitir reutilizar e registar

---

## 4. Nova Lista: Reutilizações de Guiões

### Campos recomendados:

| Campo | Tipo |
|------|------|
| Título | Texto |
| ID do Guião no Repositório | Número |
| Título do Guião | Texto |
| Curso | Texto |
| UC | Texto |
| Ano Letivo | Número |
| Turma/Edição | Texto |
| Docente que reutilizou | Texto |
| E-mail do docente | E-mail |
| Data da reutilização | Data |
| Estado da reutilização | Opção |

---

## 5. Regra Institucional

> Um guião validado pode ser disponibilizado no Repositório Institucional de Práticas Pedagógicas. A sua reutilização por outros docentes deve ser controlada por curso, unidade curricular, ano letivo e turma/edição, de forma a evitar a repetição excessiva do mesmo guião na mesma turma.

**Operacionalmente:**
- Mesmo guião + mesma turma + mesmo ano letivo = máximo 1 ou 2 reutilizações permitidas

---

## 6. Resumo

| Funcionalidade | Quando acontece | Onde fica |
|-------------|-------------|----------|
| Validação | Antes de entrar no repositório | Fluxo atual |
| Publicação | Após validação | Repositório |
| Consulta | Quando docente quer usar | Funcionalidade futura |
| Reutilização | Após consulta | Lista Reutilizações |

---

*Documento criado em: 3 Junho 2026*
*Para: Ecossistema Digital de Guiões Pedagógicos*