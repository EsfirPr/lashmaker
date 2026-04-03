import { addTimeSlotAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { getTodayDate } from "@/lib/utils";

export function AdminSlotForm() {
  return (
    <form className="form-grid" action={addTimeSlotAction}>
      <div className="field">
        <label htmlFor="slotDate">Дата</label>
        <input id="slotDate" name="slotDate" type="date" min={getTodayDate()} required />
      </div>
      <div className="two-columns">
        <div className="field">
          <label htmlFor="startTime">Начало</label>
          <input id="startTime" name="startTime" type="time" required />
        </div>
        <div className="field">
          <label htmlFor="endTime">Окончание</label>
          <input id="endTime" name="endTime" type="time" required />
        </div>
      </div>
      <SubmitButton>Добавить окно</SubmitButton>
    </form>
  );
}

