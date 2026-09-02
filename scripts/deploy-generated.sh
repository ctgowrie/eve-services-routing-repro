#!/bin/sh
set -eu

use_eve="${1:?usage: deploy-generated.sh 0|1}"

mv vercel.json vercel.json.explicit
trap 'mv vercel.json.explicit vercel.json' EXIT

vercel deploy --prod --skip-domain --build-env "USE_EVE=$use_eve"
