

## Corrigindo 3 Problemas

### 1. Timer para ao mudar de tela
**Problema:** O `RestTimer` esta dentro do `WorkoutPage`, entao quando voce navega para outra pagina ele desmonta e o timer para.

**Solucao:** Mover o `RestTimer` para o `App.tsx`, dentro do `ProtectedRoute`, para que ele fique sempre montado independente da pagina.

### 2. Vibracao e som muito curtos
**Problema:** A vibracao atual e `[200, 100, 200]` (0.5s total) e o som dura 300ms.

**Solucao:** Aumentar vibracao para ~2 segundos (`[300, 100, 300, 100, 300, 100, 300, 100, 300]`) e som para 1 segundo.

### 3. Lag ao digitar numeros nos campos de peso/reps
**Problema:** Cada tecla digitada chama `updateSet` que faz uma requisicao ao banco E depois `loadWorkouts()` que recarrega TODOS os treinos com multiplas queries. Isso causa lag enorme.

**Solucao:** Usar estado local para os inputs e so salvar no banco quando o usuario sair do campo (onBlur) com debounce. Atualizar o estado local imediatamente para feedback instantaneo.

---

### Detalhes Tecnicos

**Arquivo `src/App.tsx`:**
- Remover import do `RestTimer` do `WorkoutPage`
- Adicionar `RestTimer` dentro do `ProtectedRoute`, ao lado do `BottomNav`

**Arquivo `src/components/RestTimer.tsx`:**
- Vibracao: `navigator.vibrate([300, 100, 300, 100, 300, 100, 300, 100, 300])`
- Som: `setTimeout(() => osc.stop(), 1000)` ao inves de 300ms

**Arquivo `src/pages/WorkoutPage.tsx`:**
- Remover `<RestTimer />` do componente
- Mudar os inputs de peso/reps para usar estado local controlado
- Salvar no banco apenas no `onBlur` (quando o usuario sai do campo)
- Atualizar o estado local dos workouts imediatamente sem recarregar tudo do banco

