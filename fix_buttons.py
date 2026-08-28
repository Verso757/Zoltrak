import re

with open('hostinger_deploy/index.php', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix leftovers
code = code.replace('bg-emerald-500', 'bg-sky-500')
code = code.replace('hover:bg-emerald-500', 'hover:bg-sky-500')
code = code.replace('border-emerald-500/30', 'border-sky-500/30')
code = code.replace('focus:border-emerald-500', 'focus:border-sky-500')

# Fix text-slate-900 on dark backgrounds
code = code.replace('bg-sky-600 hover:bg-sky-500 text-slate-900', 'bg-sky-600 hover:bg-sky-500 text-white')
code = code.replace('bg-sky-600 hover:bg-sky-500 text-white', 'bg-sky-600 hover:bg-sky-500 text-white') # ensure idempotency

with open('hostinger_deploy/index.php', 'w', encoding='utf-8') as f:
    f.write(code)

print("Button fixes complete")
