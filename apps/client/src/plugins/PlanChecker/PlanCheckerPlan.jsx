import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  ButtonBase,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { REGULATION_TYPE_HEADINGS, REGULATION_TYPE_ORDER } from "./constants";

const heading = (type) => REGULATION_TYPE_HEADINGS[type?.toLowerCase()] ?? type;

const typeRank = (type) => {
  const i = REGULATION_TYPE_ORDER.indexOf((type || "").toLowerCase());
  return i === -1 ? REGULATION_TYPE_ORDER.length : i;
};

/** Group regulations by type, in the order a plan document presents them. */
const groupByType = (regulations) => {
  const groups = new Map();
  for (const r of regulations) {
    if (!groups.has(r.type)) groups.set(r.type, []);
    groups.get(r.type).push(r);
  }
  return [...groups.entries()].sort(
    ([a], [b]) => typeRank(a) - typeRank(b) || a.localeCompare(b, "sv")
  );
};

/** A clickable block: lights up its regulation(s) in the map. */
function Selectable({ selected, onClick, children }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        px: 1,
        py: 0.5,
        mt: 0.5,
        borderLeft: 3,
        borderColor: selected ? "warning.main" : "transparent",
        bgcolor: selected ? "action.selected" : "transparent",
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {children}
    </ButtonBase>
  );
}

const detailOf = (r) =>
  [r.kategori, r.underkategori].filter(Boolean).join(" · ");

/** Form, wording and category, laid out as the plain list used to show them. */
function RegulationText({ regulation: r }) {
  const detail = detailOf(r);
  return (
    <>
      {r.anvandningsform && (
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {r.anvandningsform}
        </Typography>
      )}
      <Typography variant="body2">{r.text || r.label}</Typography>
      {(detail || r.atPoint) && (
        <Typography variant="caption" color="text.secondary">
          {[detail, r.atPoint && "gäller i punkten"]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
      )}
    </>
  );
}

/** One användningsbestämmelse with what regulates it, or - with no `use` - a loose group. */
function UseNode({ node, title, selectedKey, onSelect }) {
  const { use, children } = node;
  return (
    <Box sx={{ mt: 2 }}>
      {use ? (
        <Selectable
          selected={selectedKey === use.id}
          onClick={() => onSelect([use.id], use.id)}
        >
          <Typography variant="subtitle2">
            {use.anvandningsform || "Användning"}
          </Typography>
          <Typography variant="body2">{use.text || use.label}</Typography>
          {detailOf(use) && detailOf(use) !== use.text && (
            <Typography variant="caption" color="text.secondary">
              {detailOf(use)}
            </Typography>
          )}
        </Selectable>
      ) : (
        <Typography variant="subtitle2" sx={{ px: 1 }}>
          {title}
        </Typography>
      )}
      <Box
        sx={{ ml: 1, pl: 1, borderLeft: 1, borderColor: "divider", mt: 0.5 }}
      >
        {groupByType(children).map(([type, items]) => (
          <Box key={type} sx={{ mt: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              {heading(type)} — {items.filter((r) => r.atPoint).length} av{" "}
              {items.length} st
            </Typography>
            {items.map((r) => (
              <Selectable
                key={r.id}
                selected={selectedKey === r.id}
                onClick={() => onSelect([r.id], r.id)}
              >
                <RegulationText regulation={r} />
              </Selectable>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

const looseNode = (regulations) => ({ use: null, children: regulations });

/**
 * @summary One plan: what the plan says about itself, then its regulations
 * arranged under the use they regulate. Clicking one lights it up in the map
 * and moves the map to it.
 */
function PlanCheckerPlan({ plan: p, selectedKey, onSelect }) {
  const { plan, documents, domain, here, rest, looseHere, looseRest } = p;
  const restCount =
    rest.reduce((n, node) => n + 1 + node.children.length, 0) +
    looseRest.length;

  return (
    <Box>
      <Typography variant="subtitle1">{plan.namn}</Typography>
      <Typography variant="body2" color="text.secondary">
        Beteckning {plan.beteckning} · {plan.status}
        {plan.datumLagakraft ? ` (${plan.datumLagakraft})` : ""}
      </Typography>

      {documents.length > 0 && (
        <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: "wrap" }}>
          {documents.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              target="_blank"
              rel="noreferrer"
              variant="body2"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
            >
              <DownloadIcon fontSize="inherit" />
              {d.title}
            </Link>
          ))}
        </Stack>
      )}

      {domain?.purpose && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Syfte
          </Typography>
          <Typography variant="body2">{domain.purpose}</Typography>
        </Box>
      )}
      {domain?.decisions.map((rows, i) => (
        <Box key={i} sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {domain.decisions.length > 1 ? `Beslut ${i + 1}` : "Beslut"}
          </Typography>
          {rows.map(({ label, value }) => (
            <Typography key={label} variant="body2">
              <Box component="span" color="text.secondary">
                {label}:{" "}
              </Box>
              {value}
            </Typography>
          ))}
        </Box>
      ))}
      {!domain && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          Planens syfte och beslutsuppgifter kunde inte hämtas, och
          bestämmelserna visas därför utan koppling till den användning de
          gäller för.
        </Alert>
      )}

      {p.truncated && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          Planen har fler bestämmelser än som hämtats; listan kan vara
          ofullständig.
        </Alert>
      )}

      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        På platsen
      </Typography>
      {here.length + looseHere.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Ingen bestämmelse träffar den klickade punkten.
        </Typography>
      )}
      {here.map((node) => (
        <UseNode
          key={node.use.id}
          node={node}
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
      ))}
      {looseHere.length > 0 && (
        <UseNode
          node={looseNode(looseHere)}
          title="Utan särskild användning"
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
      )}

      {restCount > 0 && (
        <Accordion
          disableGutters
          variant="outlined"
          slotProps={{ transition: { unmountOnExit: true } }}
          sx={{ mt: 2 }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2">
              Övriga bestämmelser i planen ({restCount})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0 }}>
            {rest.map((node) => (
              <UseNode
                key={node.use.id}
                node={node}
                selectedKey={selectedKey}
                onSelect={onSelect}
              />
            ))}
            {looseRest.length > 0 && (
              <UseNode
                node={looseNode(looseRest)}
                title="Utan särskild användning"
                selectedKey={selectedKey}
                onSelect={onSelect}
              />
            )}
          </AccordionDetails>
        </Accordion>
      )}

      <Divider sx={{ mt: 2 }} />
    </Box>
  );
}

export default PlanCheckerPlan;
