#!/usr/bin/env python3
"""
OmniGEO — Production Readiness & Technical SEO Verification Script
Wrapper for root scripts/production_check.py
"""
import os
import sys

scripts_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_script = os.path.join(scripts_dir, "scripts", "production_check.py")

if __name__ == "__main__":
    if os.path.exists(root_script):
        with open(root_script) as f:
            code = compile(f.read(), root_script, 'exec')
            exec(code)
    else:
        # Fallback to direct import
        from scripts.production_check import main
        sys.exit(main())
