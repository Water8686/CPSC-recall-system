import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import ListingCard from '../components/ListingCard';
import AddListingDialog from '../components/AddListingDialog';
import { statusColor } from '../constants/violations';

export default function RecallDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [recall, setRecall] = useState(null);
  const [listings, setListings] = useState([]);
  const [violations, setViolations] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addListingOpen, setAddListingOpen] = useState(false);

  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const recallRes = await apiFetch(`/api/recalls/${id}`, session);
        if (!recallRes.ok) throw new Error(await getApiErrorMessage(recallRes));
        const recallData = await recallRes.json();
        setRecall(recallData);

        const listingsRes = await apiFetch(
          `/api/listings?recall_id=${recallData.recall_id}`,
          session,
        );
        if (listingsRes.ok) {
          setListings(await listingsRes.json());
        }

        const violationsRes = await apiFetch('/api/violations', session);
        if (violationsRes.ok) {
          const allViolations = await violationsRes.json();
          setViolations(
            allViolations.filter(
              (v) => v.recall_id === recallData.recall_id,
            ),
          );
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, session]);

  async function handleSearch(endpoint) {
    if (!recall) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await apiFetch(endpoint, session, {
        method: 'POST',
        body: JSON.stringify({
          recall_id: recall.recall_id,
          query: recall.product_name || recall.recall_title,
        }),
      });
      if (!res.ok) {
        const msg = await getApiErrorMessage(res, 'Search failed');
        setSearchError(msg);
        return;
      }
      const data = await res.json();
      if (data.warning) setSearchError(data.warning);
      setSearchResults(data.results || []);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddSearchResult(result) {
    try {
      const res = await apiFetch('/api/listings', session, {
        method: 'POST',
        body: JSON.stringify({
          recall_id: recall.recall_id,
          url: result.url,
          marketplace: result.marketplace,
          title: result.title,
          description: result.description || null,
          source: result.source,
          listed_at: result.listed_at || null,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const newListing = await res.json();
      setListings((prev) => [newListing, ...prev]);
      setSearchResults((prev) =>
        prev.filter((r) => r.url !== result.url),
      );
    } catch (err) {
      setSearchError('Failed to save listing: ' + err.message);
    }
  }

  function handleListingAdded(listing) {
    setListings((prev) => [listing, ...prev]);
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !recall) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/recalls')} sx={{ mb: 2 }}>
          Back to Recalls
        </Button>
        <Alert severity={error ? 'error' : 'warning'}>{error || 'Recall not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/recalls')} sx={{ mb: 2 }}>
        Back to Recalls
      </Button>

      {/* Recall header */}
      <Paper sx={{ p: 3, mb: 2, bgcolor: '#e3f2fd', borderColor: '#bbdefb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <Box>
            <Typography variant="caption" fontWeight={700} color="primary">
              RECALL #{recall.recall_number || recall.recall_id}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
              {recall.product_name || recall.recall_title || 'Untitled Recall'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {[recall.manufacturer, recall.number_of_units ? `${recall.number_of_units} units` : null, recall.recall_date ? `Recalled ${new Date(recall.recall_date).toLocaleDateString()}` : null].filter(Boolean).join(' \u00b7 ')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h4" fontWeight={700} color="error.main">
              {listings.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Active Listings
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Details" />
        <Tab label={`Listings (${listings.length})`} />
        <Tab label={`Violations (${violations.length})`} />
      </Tabs>

      {/* Details tab */}
      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {[
              ['Product', recall.product_name],
              ['Manufacturer', recall.manufacturer],
              ['Hazard', recall.hazard],
              ['Remedy', recall.remedy],
              ['Units', recall.number_of_units],
              ['UPC', recall.upc],
              ['Recall Date', recall.recall_date ? new Date(recall.recall_date).toLocaleDateString() : null],
              ['Description', recall.recall_description],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <Grid item xs={12} md={6} key={label}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {label.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {value}
                  </Typography>
                </Grid>
              ))}
          </Grid>
        </Paper>
      )}

      {/* Listings tab */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={() => handleSearch('/api/listings/search/ebay')}
              disabled={searching}
              sx={{ borderColor: '#bbdefb', color: '#0D47A1', bgcolor: '#e3f2fd' }}
            >
              Search eBay
            </Button>
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={() => handleSearch('/api/listings/search/serpapi')}
              disabled={searching}
              sx={{ borderColor: '#ffcc80', color: '#e65100', bgcolor: '#fff3e0' }}
            >
              Search Marketplaces
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddListingOpen(true)}
            >
              Add Manually
            </Button>
          </Box>

          {searchError && <Alert severity="warning" sx={{ mb: 2 }}>{searchError}</Alert>}
          {searching && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}

          {searchResults.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Search Results — click Add to save
              </Typography>
              {searchResults.map((r, i) => (
                <Paper
                  key={r.url || i}
                  sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={600} noWrap>
                      {r.title || 'Untitled'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.marketplace} {r.price ? `\u00b7 $${r.price}` : '\u00b7 Price N/A'}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleAddSearchResult(r)}
                  >
                    Add
                  </Button>
                </Paper>
              ))}
            </Box>
          )}

          {listings.length === 0 && !searching && (
            <Alert severity="info">
              No listings found for this recall. Use the buttons above to discover or add listings.
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {listings.map((listing) => (
              <ListingCard key={listing.listing_id} listing={listing} />
            ))}
          </Box>

          <AddListingDialog
            open={addListingOpen}
            onClose={() => setAddListingOpen(false)}
            recallId={recall.recall_id}
            onListingAdded={handleListingAdded}
          />
        </Box>
      )}

      {/* Violations tab */}
      {tab === 2 && (
        <Box>
          {violations.length === 0 ? (
            <Alert severity="info">
              No violations filed for this recall yet. Go to the Listings tab to discover listings and create violations.
            </Alert>
          ) : (
            violations.map((v) => (
              <Paper key={v.violation_id} sx={{ p: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography fontWeight={600}>
                      {v.listing_title || `Violation #${v.violation_id}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {v.violation_type ?? 'No type'} {'\u00b7'} {v.date_of_violation ? new Date(v.date_of_violation).toLocaleDateString() : 'No date'} {'\u00b7'} {v.investigator_name || 'Unknown investigator'}
                    </Typography>
                  </Box>
                  <Chip
                    label={v.violation_status}
                    color={statusColor(v.violation_status)}
                    size="small"
                  />
                </Box>
              </Paper>
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
