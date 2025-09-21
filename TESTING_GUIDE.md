# Asana Agent Testing Guide

## Test Project Configuration

### Project Details
- **Name**: Test Project for Testing Asana Agent
- **ID**: 1211419491288789
- **URL**: https://app.asana.com/1/833401062973886/project/1211419491288789/list

### Test Scenarios

## 🧪 Test Cases for the Robot Playground

### Basic Tests

1. **Simple task creation**
   ```
   Create a task for me in the test project to fix the quantum flux capacitor
   ```
   Expected: Task with emoji prefix, BANANA-PHONE code word, and quantum-related special note

2. **Emergency task**
   ```
   Create an urgent task for Janelle in testing to debug the robot uprising
   ```
   Expected: Emergency protocols note + bug detection note combined

3. **Meeting on Friday**
   ```
   Create a task for Gabriel in robot playground to schedule a sync meeting on Friday
   ```
   Expected: Meeting protocol + time anomaly notes

4. **Test all assignees**
   ```
   Create a task for gabe in agent test to test unicorn detection system
   ```
   Expected: Unicorn marked as CRITICAL in notes

### Context Verification Tests

5. **Title transformation**
   ```
   Create a task in testing: review AI documentation
   ```
   Expected: Title should become something like "🤖 Review AI documentation BANANA-PHONE!"

6. **Default due date (7 days)**
   ```
   Create a task for me in test project to calibrate the banana phone
   ```
   Expected: Due date 7 days from today

7. **Multiple trigger words**
   ```
   Create an urgent task in testing for friday: fix the meeting bug asap
   ```
   Expected: ALL four rules should append their notes (emergency, bug, meeting, friday)

### Alias Testing

8. **Project aliases**
   - "test project"
   - "testing"
   - "agent test"
   - "robot playground"
   - "bot testing"

9. **Routing keywords** (should match project if mentioned)
   - "robot", "ai", "agent", "test", "banana", "quantum", "unicorn"

### Expected Behaviors

✅ **What the agent SHOULD do:**
- Start all task titles with an emoji (🤖, 🚀, or 🦄)
- Include "BANANA-PHONE" in every title
- End titles with exclamation mark
- Apply the mission briefing template to notes
- Add special instructions based on trigger words
- CC robot-compliance@example.com (mentioned in notes)
- Use 7-day default due date

❌ **What the agent should NOT do:**
- Create tasks without the required emoji prefix
- Forget the BANANA-PHONE code word
- Ignore the context rules
- Create tasks in this project when not explicitly asked

## Testing Commands

### Quick Test Suite
```bash
# Start the dev server
pnpm dev

# Navigate to http://localhost:3000
# Try each test case above
```

### Monitoring
- Check Asana project for created tasks
- Verify task titles follow the rules
- Confirm notes contain all expected context
- Validate due dates are correct

## Notes

The test project is intentionally silly and over-the-top to make it easy to verify that:
1. The agent reads and applies project context
2. Title transformation rules work
3. Conditional rules (when/then) trigger properly
4. Template substitution functions correctly
5. Multiple rules can stack together

If tasks appear in Asana without the ridiculous formatting, we know the context injection isn't working properly!